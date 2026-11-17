<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Service;
use App\Models\Sparepart;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $r)
    {
        $user = $r->user();
        $isTech = $user->role === 'TEKNISI';
        $scope = fn ($q) => $isTech ? $q->where('technician_id', $user->id) : $q;
        $income = fn ($from) => (int) Payment::where('created_at', '>=', $from)->selectRaw("COALESCE(SUM(CASE WHEN type='REFUND' THEN -amount ELSE amount END),0) s")->value('s');

        $counts = $scope(Service::query())->selectRaw('status, COUNT(*) c')->groupBy('status')->pluck('c', 'status');

        return [
            'counts' => $counts,
            'open_count' => collect(Service::OPEN)->sum(fn ($s) => $counts[$s] ?? 0),
            'ready_count' => Service::where('status', 'SELESAI')->count(),
            'today_in' => Service::where('received_at', '>=', today())->count(),
            'income_today' => $isTech ? null : $income(today()),
            'income_month' => $isTech ? null : $income(now()->startOfMonth()),
            'overdue' => $scope(Service::whereIn('status', Service::OPEN)->whereDate('estimated_done', '<', today()))->count(),
            'recent' => $scope(Service::with(['customer:id,name', 'technician'])->whereIn('status', Service::OPEN))
                ->orderByDesc('received_at')->limit(10)->get(['id', 'number', 'customer_id', 'technician_id', 'device_brand', 'device_model', 'status', 'received_at']),
            'low_stock' => Sparepart::whereColumn('stock', '<=', 'min_stock')->orderBy('stock')->limit(6)->get(['id', 'name', 'stock', 'min_stock']),
        ];
    }
}
