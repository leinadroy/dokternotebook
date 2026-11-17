<?php

namespace App\Http\Controllers;

use App\Models\ServiceItem;
use App\Models\Sparepart;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SparepartController extends Controller
{
    public function index(Request $r)
    {
        $q = Sparepart::orderBy('category')->orderBy('name');
        if ($r->filled('q')) {
            $q->where(fn ($w) => $w->where('name', 'like', "%{$r->q}%")->orWhere('sku', 'like', '%' . strtoupper($r->q) . '%'));
        }
        if ($r->filled('cat')) {
            $q->where('category', $r->cat);
        }
        if ($r->boolean('low')) {
            $q->whereColumn('stock', '<=', 'min_stock');
        }
        if ($r->boolean('in_stock')) {
            $q->where('stock', '>', 0);
        }
        $rows = $q->get();
        if (!$r->user()->isManager()) {
            $rows->makeHidden('buy_price');
        }
        return $rows;
    }

    public function movements()
    {
        return StockMovement::with(['sparepart', 'service'])->orderByDesc('id')->limit(15)->get();
    }

    private function rules(?Sparepart $p = null): array
    {
        return [
            'sku' => ['required', 'string', 'max:50', Rule::unique('spareparts')->ignore($p?->id)],
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:50',
            'buy_price' => 'nullable|integer|min:0',
            'sell_price' => 'nullable|integer|min:0',
            'min_stock' => 'nullable|integer|min:0',
            'location' => 'nullable|string|max:50',
        ];
    }

    public function store(Request $r)
    {
        $r->merge(['sku' => strtoupper(trim((string) $r->sku))]);
        $d = $r->validate($this->rules() + ['stock' => 'nullable|integer|min:0'], ['sku.unique' => 'Kode sudah dipakai']);
        $p = DB::transaction(function () use ($d) {
            foreach (['buy_price', 'sell_price', 'min_stock', 'stock'] as $k) {
                $d[$k] = $d[$k] ?? 0;
            }
            $p = Sparepart::create($d);
            if ($p->stock > 0) {
                StockMovement::create(['sparepart_id' => $p->id, 'qty' => $p->stock, 'type' => 'MASUK', 'note' => 'Stok awal']);
            }
            return $p;
        });
        return response()->json(['message' => "Sparepart {$p->name} ditambahkan", 'id' => $p->id], 201);
    }

    public function update(Request $r, Sparepart $sparepart)
    {
        $r->merge(['sku' => strtoupper(trim((string) $r->sku))]);
        $d = $r->validate($this->rules($sparepart), ['sku.unique' => 'Kode sudah dipakai']);
        foreach (['buy_price', 'sell_price', 'min_stock'] as $k) {
            $d[$k] = $d[$k] ?? 0;
        }
        $sparepart->update($d);
        return ['message' => 'Sparepart disimpan'];
    }

    public function destroy(Sparepart $sparepart)
    {
        if (ServiceItem::where('sparepart_id', $sparepart->id)->exists()) {
            return response()->json(['message' => 'Sparepart sudah pernah dipakai servis, tidak bisa dihapus'], 422);
        }
        $sparepart->delete();
        return ['message' => 'Sparepart dihapus'];
    }

    /** MASUK (+), KELUAR (−), PENYESUAIAN (stok opname: set stok = qty) */
    public function adjust(Request $r, Sparepart $sparepart)
    {
        $d = $r->validate([
            'type' => ['required', Rule::in(['MASUK', 'KELUAR', 'PENYESUAIAN'])],
            'qty' => 'required|integer|min:0',
            'note' => 'nullable|string|max:255',
        ]);
        return DB::transaction(function () use ($d, $sparepart) {
            $p = Sparepart::lockForUpdate()->find($sparepart->id);
            $delta = match ($d['type']) {
                'MASUK' => $d['qty'],
                'KELUAR' => -$d['qty'],
                'PENYESUAIAN' => $d['qty'] - $p->stock,
            };
            $delta = max($delta, -$p->stock);
            if ($delta === 0) {
                return ['message' => 'Tidak ada perubahan stok'];
            }
            $before = $p->stock;
            $p->increment('stock', $delta);
            StockMovement::create(['sparepart_id' => $p->id, 'qty' => $delta, 'type' => $d['type'], 'note' => $d['note'] ?? null]);
            return ['message' => "Stok {$p->name}: {$before} → " . ($before + $delta)];
        });
    }
}
