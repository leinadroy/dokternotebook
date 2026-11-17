<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\Request;

class WarrantyController extends Controller
{
    public function __invoke(Request $r)
    {
        $found = [];
        if ($r->filled('q')) {
            $term = trim($r->q);
            $phone = ltrim(preg_replace('/\D/', '', $term), '0');
            $found = Service::with(['customer:id,name', 'claims'])
                ->where(function ($w) use ($term, $phone) {
                    $w->where('number', 'like', '%' . strtoupper($term) . '%')
                        ->orWhere('serial_number', 'like', "%$term%")
                        ->orWhereHas('customer', function ($c) use ($term, $phone) {
                            $c->where('name', 'like', "%$term%");
                            if ($phone !== '') {
                                $c->orWhere('phone', 'like', "%$phone%");
                            }
                        });
                })
                ->orderByDesc('received_at')->limit(30)->get()
                ->map(fn ($s) => $s->setAttribute('warranty', $s->warranty()));
        }

        $active = Service::with('customer:id,name')
            ->where('status', 'DIAMBIL')->where('warranty_days', '>', 0)
            ->where('picked_up_at', '>=', now()->subYear())
            ->orderByDesc('picked_up_at')->get()
            ->map(fn ($s) => $s->setAttribute('warranty', $s->warranty()))
            ->filter(fn ($s) => $s->warranty['active'])->values()->take(30);

        $claims = Service::with(['customer:id,name', 'parent'])->where('is_warranty_claim', true)
            ->orderByDesc('received_at')->limit(20)->get();

        return compact('found', 'active', 'claims');
    }
}
