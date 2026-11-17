<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Payment;
use App\Models\Service;
use App\Models\ServiceItem;
use App\Models\Setting;
use App\Models\Sparepart;
use App\Models\StockMovement;
use App\Models\User;
use App\Support\Wa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ServiceController extends Controller
{
    public function index(Request $r)
    {
        $user = $r->user();
        $q = Service::with(['customer:id,name,phone', 'technician', 'items', 'payments'])->orderByDesc('received_at')->orderByDesc('id');

        if ($r->status === 'AKTIF') {
            $q->whereIn('status', Service::OPEN);
        } elseif ($r->filled('status')) {
            $q->where('status', $r->status);
        }
        if ($user->role === 'TEKNISI') {
            $q->where(fn ($w) => $w->where('technician_id', $user->id)->orWhereNull('technician_id'));
        } elseif ($r->filled('tech')) {
            $r->tech === 'none' ? $q->whereNull('technician_id') : $q->where('technician_id', (int) $r->tech);
        }
        if ($r->filled('q')) {
            $term = trim($r->q);
            $phone = ltrim(preg_replace('/\D/', '', $term), '0');
            $q->where(function ($w) use ($term, $phone) {
                $w->where('number', 'like', "%$term%")
                    ->orWhere('device_brand', 'like', "%$term%")
                    ->orWhere('device_model', 'like', "%$term%")
                    ->orWhere('serial_number', 'like', "%$term%")
                    ->orWhereHas('customer', function ($c) use ($term, $phone) {
                        $c->where('name', 'like', "%$term%");
                        if ($phone !== '') {
                            $c->orWhere('phone', 'like', "%$phone%");
                        }
                    });
            });
        }

        $page = $q->paginate(25);
        $page->getCollection()->transform(function (Service $s) {
            $s->setAttribute('totals', $s->totals());
            $s->unsetRelation('items')->unsetRelation('payments');
            return $s;
        });
        return $page;
    }

    public function store(Request $r)
    {
        $d = $r->validate([
            'phone' => 'required|string|max:30',
            'customer_name' => 'required|string|max:255',
            'address' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'device_type' => 'nullable|string|max:30',
            'device_brand' => 'required|string|max:50',
            'device_model' => 'required|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'device_password' => 'nullable|string|max:100',
            'complaint' => 'required|string',
            'accessories' => 'nullable|string|max:255',
            'physical_condition' => 'nullable|string|max:255',
            'technician_id' => 'nullable|exists:users,id',
            'estimated_cost' => 'nullable|integer|min:0',
            'estimated_done' => 'nullable|date',
            'down_payment' => 'nullable|integer|min:0',
            'dp_method' => ['nullable', Rule::in(['TUNAI', 'TRANSFER', 'QRIS', 'DEBIT'])],
            'warranty_days' => 'nullable|integer|min:0|max:3650',
            'notes' => 'nullable|string|max:255',
            'parent_id' => 'nullable|exists:services,id',
        ]);
        $user = $r->user();

        $svc = DB::transaction(function () use ($d, $user) {
            $customer = Customer::updateOrCreate(
                ['phone' => Customer::normPhone($d['phone'])],
                array_filter([
                    'name' => $d['customer_name'],
                    'address' => $d['address'] ?? null,
                    'email' => $d['email'] ?? null,
                ], fn ($v) => $v !== null && $v !== '')
            );
            $settings = Setting::kv();
            $parentId = $d['parent_id'] ?? null;
            $svc = Service::create([
                'number' => Service::nextNumber(),
                'customer_id' => $customer->id,
                'device_type' => $d['device_type'] ?? 'Laptop',
                'device_brand' => $d['device_brand'],
                'device_model' => $d['device_model'],
                'serial_number' => $d['serial_number'] ?? null,
                'device_password' => $d['device_password'] ?? null,
                'complaint' => $d['complaint'],
                'accessories' => $d['accessories'] ?? null,
                'physical_condition' => $d['physical_condition'] ?? null,
                'technician_id' => $d['technician_id'] ?? null,
                'created_by' => $user->id,
                'estimated_cost' => $d['estimated_cost'] ?? 0,
                'estimated_done' => $d['estimated_done'] ?? null,
                'warranty_days' => $d['warranty_days'] ?? (int) ($settings['default_warranty_days'] ?? 30),
                'notes' => $d['notes'] ?? null,
                'is_warranty_claim' => (bool) $parentId,
                'parent_id' => $parentId,
                'received_at' => now(),
            ]);
            $svc->logs()->create(['status' => 'DITERIMA', 'note' => $parentId ? 'Klaim garansi - unit diterima' : 'Unit diterima', 'user_id' => $user->id]);
            if (($d['down_payment'] ?? 0) > 0) {
                $svc->payments()->create(['amount' => $d['down_payment'], 'type' => 'DP', 'method' => $d['dp_method'] ?? 'TUNAI', 'user_id' => $user->id]);
            }
            return $svc;
        });

        return response()->json(['id' => $svc->id, 'number' => $svc->number], 201);
    }

    public function show(Request $r, Service $service)
    {
        $s = $service->load(['customer', 'technician', 'creator', 'parent', 'claims', 'items', 'payments.user', 'logs.user']);
        $settings = Setting::kv();
        $t = $s->totals();
        $note = $s->status === 'SELESAI' && $t['remaining'] > 0
            ? 'Total biaya Rp ' . number_format($t['total'], 0, ',', '.') . ', sisa pembayaran Rp ' . number_format($t['remaining'], 0, ',', '.') . '.'
            : '';
        return [
            'service' => $s,
            'totals' => $t,
            'warranty' => $s->warranty(),
            'wa_link' => Wa::link($s->customer->phone, Wa::message($s, $settings, $note)),
            'fonnte_active' => trim($settings['fonnte_token'] ?? '') !== '',
        ];
    }

    public function update(Request $r, Service $service)
    {
        $isMgr = $r->user()->isManager();
        $rules = [
            'diagnosis' => 'nullable|string',
            'notes' => 'nullable|string|max:255',
            'estimated_cost' => 'nullable|integer|min:0',
            'estimated_done' => 'nullable|date',
        ];
        if ($isMgr) {
            $rules += [
                'technician_id' => 'nullable|exists:users,id',
                'warranty_days' => 'nullable|integer|min:0|max:3650',
                'discount' => 'nullable|integer|min:0',
                'device_brand' => 'required|string|max:50',
                'device_model' => 'required|string|max:100',
                'serial_number' => 'nullable|string|max:100',
                'device_password' => 'nullable|string|max:100',
                'complaint' => 'required|string',
                'accessories' => 'nullable|string|max:255',
                'physical_condition' => 'nullable|string|max:255',
            ];
        }
        $d = $r->validate($rules);
        $d['estimated_cost'] = $d['estimated_cost'] ?? 0;
        if ($isMgr) {
            $d['warranty_days'] = $d['warranty_days'] ?? 0;
            $d['discount'] = $d['discount'] ?? 0;
        }
        $service->update($d);
        return ['message' => 'Data servis disimpan'];
    }

    public function updateStatus(Request $r, Service $service)
    {
        $d = $r->validate([
            'status' => ['required', Rule::in(Service::STATUSES)],
            'note' => 'nullable|string|max:255',
            'send_wa' => 'boolean',
            'force' => 'boolean',
        ]);
        $user = $r->user();
        $service->load(['customer', 'items', 'payments']);

        if ($user->role === 'TEKNISI' && ($d['status'] === 'DIAMBIL' || $service->technician_id !== $user->id)) {
            return response()->json(['message' => "Teknisi hanya bisa mengubah status servis yang ditugaskan kepadanya (kecuali 'Diambil')."], 403);
        }
        if ($d['status'] === 'DIAMBIL' && $service->totals()['remaining'] > 0 && !($d['force'] ?? false)) {
            return response()->json(['message' => 'Masih ada sisa tagihan. Catat pelunasan dulu sebelum unit diambil.'], 422);
        }

        $service->status = $d['status'];
        if ($d['status'] === 'SELESAI') {
            $service->finished_at = now();
        }
        if ($d['status'] === 'DIAMBIL') {
            $service->finished_at ??= now();
            $service->picked_up_at = now();
        } else {
            $service->picked_up_at = null;
        }
        $service->save();
        $service->logs()->create(['status' => $d['status'], 'note' => $d['note'] ?? null, 'user_id' => $user->id]);

        $msg = 'Status diubah ke ' . Service::LABELS[$d['status']];
        if ($d['send_wa'] ?? false) {
            $settings = Setting::kv();
            if (Wa::sendAuto($service->customer->phone, Wa::message($service, $settings, $d['note'] ?? ''), $settings)) {
                $msg .= ' · WhatsApp terkirim otomatis';
            }
        }
        return ['message' => $msg];
    }

    public function addItem(Request $r, Service $service)
    {
        $d = $r->validate([
            'type' => ['required', Rule::in(['JASA', 'PART'])],
            'description' => 'required_if:type,JASA|nullable|string|max:255',
            'sparepart_id' => 'required_if:type,PART|nullable|exists:spareparts,id',
            'qty' => 'nullable|integer|min:1',
            'price' => 'nullable|integer|min:0',
        ]);
        $qty = $d['qty'] ?? 1;

        if ($d['type'] === 'PART') {
            return DB::transaction(function () use ($d, $qty, $service) {
                $part = Sparepart::lockForUpdate()->findOrFail($d['sparepart_id']);
                if ($part->stock < $qty) {
                    return response()->json(['message' => "Stok {$part->name} tidak cukup (sisa {$part->stock})"], 422);
                }
                $service->items()->create([
                    'type' => 'PART', 'sparepart_id' => $part->id, 'description' => $part->name, 'qty' => $qty,
                    'price' => $d['price'] ?? $part->sell_price, 'cost_price' => $part->buy_price,
                ]);
                $part->decrement('stock', $qty);
                StockMovement::create(['sparepart_id' => $part->id, 'qty' => -$qty, 'type' => 'KELUAR', 'service_id' => $service->id, 'note' => 'Dipakai servis']);
                return ['message' => 'Sparepart ditambahkan'];
            });
        }

        $service->items()->create(['type' => 'JASA', 'description' => $d['description'], 'qty' => $qty, 'price' => $d['price'] ?? 0]);
        return ['message' => 'Jasa ditambahkan'];
    }

    public function deleteItem(ServiceItem $item)
    {
        DB::transaction(function () use ($item) {
            if ($item->sparepart_id) {
                Sparepart::whereKey($item->sparepart_id)->increment('stock', $item->qty);
                StockMovement::create(['sparepart_id' => $item->sparepart_id, 'qty' => $item->qty, 'type' => 'MASUK', 'service_id' => $item->service_id, 'note' => 'Batal dipakai servis']);
            }
            $item->delete();
        });
        return ['message' => 'Item dihapus'];
    }

    public function addPayment(Request $r, Service $service)
    {
        $d = $r->validate([
            'amount' => 'required|integer|min:1',
            'method' => ['required', Rule::in(['TUNAI', 'TRANSFER', 'QRIS', 'DEBIT'])],
            'type' => ['required', Rule::in(['DP', 'PELUNASAN', 'REFUND'])],
            'note' => 'nullable|string|max:255',
        ]);
        $service->payments()->create($d + ['user_id' => $r->user()->id]);
        return ['message' => 'Pembayaran dicatat'];
    }

    public function deletePayment(Payment $payment)
    {
        $payment->delete();
        return ['message' => 'Pembayaran dihapus'];
    }

    public function technicians()
    {
        return User::where('role', 'TEKNISI')->where('active', true)->orderBy('name')->get(['id', 'name']);
    }
}
