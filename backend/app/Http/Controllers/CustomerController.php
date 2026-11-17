<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    public function index(Request $r)
    {
        $q = Customer::withCount('services')->withMax('services', 'received_at')->orderByDesc('created_at');
        if ($r->filled('q')) {
            $term = trim($r->q);
            $phone = ltrim(preg_replace('/\D/', '', $term), '0');
            $q->where(function ($w) use ($term, $phone) {
                $w->where('name', 'like', "%$term%")->orWhere('address', 'like', "%$term%");
                if ($phone !== '') {
                    $w->orWhere('phone', 'like', "%$phone%");
                }
            });
        }
        return $q->limit(100)->get();
    }

    /** Auto-isi form terima servis berdasarkan no HP */
    public function lookup(Request $r)
    {
        $phone = Customer::normPhone($r->phone);
        if (strlen($phone) < 8) {
            return response()->json(null);
        }
        $c = Customer::withCount('services')->where('phone', $phone)->first();
        return response()->json($c ? $c->only('id', 'name', 'address', 'email', 'services_count') : null);
    }

    public function show(Customer $customer)
    {
        $customer->load(['services' => fn ($q) => $q->with(['items', 'payments'])->orderByDesc('received_at')]);
        $services = $customer->services->map(function ($s) {
            $s->setAttribute('totals', $s->totals());
            return $s->makeHidden(['items', 'payments']);
        });
        return [
            'customer' => $customer->makeHidden('services'),
            'services' => $services,
            'total_paid' => $services->sum(fn ($s) => $s->totals['paid']),
        ];
    }

    public function update(Request $r, Customer $customer)
    {
        $r->merge(['phone' => Customer::normPhone($r->phone)]);
        $d = $r->validate([
            'name' => 'required|string|max:255',
            'phone' => ['required', 'string', 'max:30', Rule::unique('customers')->ignore($customer->id)],
            'address' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'notes' => 'nullable|string',
        ], ['phone.unique' => 'Nomor HP sudah dipakai pelanggan lain']);
        $customer->update($d);
        return ['message' => 'Data pelanggan disimpan'];
    }
}
