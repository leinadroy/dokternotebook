<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /** Pengaturan publik (tanpa token rahasia) — untuk kop nota, halaman login & cek status */
    public function public()
    {
        $s = Setting::kv();
        unset($s['fonnte_token']);
        return $s;
    }

    public function show()
    {
        return Setting::kv();
    }

    public function update(Request $r)
    {
        $d = $r->validate([
            'store_name' => 'required|string|max:100',
            'store_tagline' => 'nullable|string|max:150',
            'store_address' => 'nullable|string|max:255',
            'store_phone' => 'nullable|string|max:50',
            'default_warranty_days' => 'required|integer|min:0|max:3650',
            'receipt_footer' => 'nullable|string',
            'wa_template' => 'nullable|string',
            'public_url' => 'nullable|url',
            'fonnte_token' => 'nullable|string|max:255',
        ]);
        foreach (Setting::KEYS as $key) {
            Setting::updateOrCreate(['key' => $key], ['value' => (string) ($d[$key] ?? '')]);
        }
        return ['message' => 'Pengaturan disimpan'];
    }

    /** Cek status servis oleh pelanggan: nomor nota + 4 digit terakhir no HP */
    public function cek(Request $r)
    {
        $nota = strtoupper(trim((string) $r->nota));
        $hp = preg_replace('/\D/', '', (string) $r->hp);
        $s = Service::with(['customer', 'items', 'payments', 'logs'])->where('number', $nota)->first();
        if (!$s || strlen($hp) < 4 || !str_ends_with($s->customer->phone, substr($hp, -4))) {
            return response()->json(['message' => 'Data tidak ditemukan. Periksa nomor nota dan 4 digit terakhir nomor HP Anda.'], 404);
        }
        $t = $s->totals();
        return [
            'number' => $s->number,
            'status' => $s->status,
            'device' => "{$s->device_brand} {$s->device_model}",
            'customer_name' => $s->customer->name,
            'complaint' => $s->complaint,
            'diagnosis' => $s->diagnosis,
            'received_at' => $s->received_at,
            'estimated_done' => $s->estimated_done?->toDateString(),
            'estimated_cost' => $s->estimated_cost,
            'total' => $t['total'],
            'remaining' => $t['remaining'],
            'warranty' => $s->warranty(),
            'logs' => $s->logs->sortBy('id')->values()->map(fn ($l) => ['status' => $l->status, 'created_at' => $l->created_at]),
        ];
    }
}
