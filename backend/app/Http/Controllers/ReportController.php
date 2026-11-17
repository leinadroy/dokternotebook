<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Service;
use App\Models\ServiceItem;
use App\Models\User;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    public function __invoke(Request $r)
    {
        $from = Carbon::parse($r->input('from', now()->startOfMonth()->toDateString()))->startOfDay();
        $to = Carbon::parse($r->input('to', now()->toDateString()))->endOfDay();
        $range = [$from, $to];

        $payments = Payment::whereBetween('created_at', $range)->get();
        $items = ServiceItem::whereBetween('created_at', $range)->get();
        $finished = Service::with('items')->whereBetween('finished_at', $range)->get();

        $daily = [];
        foreach (CarbonPeriod::create($from->copy(), $to->copy()->startOfDay()) as $d) {
            $daily[$d->toDateString()] = 0;
        }
        $byMethod = [];
        foreach ($payments as $p) {
            $k = $p->created_at->toDateString();
            if (isset($daily[$k])) {
                $daily[$k] += $p->signedAmount();
            }
            $byMethod[$p->method] = ($byMethod[$p->method] ?? 0) + $p->signedAmount();
        }

        $jasa = $items->where('type', 'JASA')->sum(fn ($i) => $i->qty * $i->price);
        $parts = $items->where('type', 'PART');
        $partSales = $parts->sum(fn ($i) => $i->qty * $i->price);
        $partCost = $parts->sum(fn ($i) => $i->qty * $i->cost_price);

        $perTech = User::where('role', 'TEKNISI')->orderBy('name')->get(['id', 'name'])->map(function ($t) use ($finished) {
            $done = $finished->where('technician_id', $t->id);
            return [
                'name' => $t->name,
                'count' => $done->count(),
                'jasa' => $done->sum(fn ($s) => $s->items->where('type', 'JASA')->sum(fn ($i) => $i->qty * $i->price)),
            ];
        });

        $topParts = $parts->groupBy('sparepart_id')->map(fn ($g) => [
            'name' => $g->first()->description,
            'qty' => $g->sum('qty'),
            'omzet' => $g->sum(fn ($i) => $i->qty * $i->price),
        ])->sortByDesc('qty')->values()->take(10);

        $piutang = Service::with(['items', 'payments', 'customer:id,name'])->whereIn('status', ['SELESAI', 'DIAMBIL'])->get()
            ->map(fn ($s) => ['id' => $s->id, 'number' => $s->number, 'customer' => $s->customer->name, 'status' => $s->status, 'remaining' => $s->totals()['remaining']])
            ->filter(fn ($x) => $x['remaining'] > 0)->values();

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'income' => $payments->sum(fn ($p) => $p->signedAmount()),
            'received' => Service::whereBetween('received_at', $range)->count(),
            'finished' => $finished->count(),
            'jasa' => $jasa,
            'part_sales' => $partSales,
            'part_cost' => $partCost,
            'by_method' => $byMethod,
            'daily' => $daily,
            'status_counts' => Service::whereBetween('received_at', $range)->selectRaw('status, COUNT(*) c')->groupBy('status')->pluck('c', 'status'),
            'per_tech' => $perTech,
            'top_parts' => $topParts,
            'piutang' => $piutang,
        ];
    }
}
