<?php
defined('DN_ROOT') or exit;

function api_spareparts_index(): array
{
    $u = require_user();
    $where = ['1'];
    $p = [];
    if ($term = query('q')) {
        $where[] = '(name LIKE ? OR sku LIKE ?)';
        array_push($p, "%$term%", '%' . strtoupper($term) . '%');
    }
    if ($cat = query('cat')) { $where[] = 'category = ?'; $p[] = $cat; }
    if (query('low')) $where[] = 'stock <= min_stock';
    if (query('in_stock')) $where[] = 'stock > 0';
    $list = rows('SELECT * FROM spareparts WHERE ' . implode(' AND ', $where) . ' ORDER BY category, name', $p);
    if (!is_manager($u)) {
        foreach ($list as &$r) unset($r['buy_price']);
    }
    return $list;
}

function api_stock_movements(): array
{
    require_user();
    $list = rows(
        'SELECT m.*, p.name p_name, p.sku p_sku, s.number s_number
         FROM stock_movements m JOIN spareparts p ON p.id = m.sparepart_id LEFT JOIN services s ON s.id = m.service_id
         ORDER BY m.id DESC LIMIT 15'
    );
    return array_map(fn ($m) => [
        'id' => $m['id'], 'qty' => $m['qty'], 'type' => $m['type'], 'note' => $m['note'], 'created_at' => iso($m['created_at']),
        'sparepart' => ['id' => $m['sparepart_id'], 'name' => $m['p_name'], 'sku' => $m['p_sku']],
        'service' => $m['service_id'] ? ['id' => $m['service_id'], 'number' => $m['s_number']] : null,
    ], $list);
}

function sparepart_input(?int $id): array
{
    $in = body();
    $in['sku'] = strtoupper(trim((string) ($in['sku'] ?? '')));
    $rules = [
        'sku' => 'required|string|max:50',
        'name' => 'required|string|max:255',
        'category' => 'required|string|max:50',
        'buy_price' => 'nullable|int|min:0',
        'sell_price' => 'nullable|int|min:0',
        'min_stock' => 'nullable|int|min:0',
        'location' => 'nullable|string|max:50',
    ];
    if (!$id) $rules['stock'] = 'nullable|int|min:0';
    $d = validate($in, $rules);
    foreach (['buy_price', 'sell_price', 'min_stock', 'stock'] as $k) {
        if (isset($rules[$k])) $d[$k] = $d[$k] ?? 0;
    }
    if (val('SELECT COUNT(*) FROM spareparts WHERE sku = ? AND id <> ?', [$d['sku'], $id ?? 0])) {
        throw new HttpError(422, 'Kode sudah dipakai');
    }
    return $d;
}

function api_spareparts_store(): array
{
    require_user(['OWNER', 'ADMIN']);
    $d = sparepart_input(null);
    $id = tx(function () use ($d) {
        $id = insert('spareparts', $d + ['created_at' => now(), 'updated_at' => now()]);
        if ($d['stock'] > 0) insert('stock_movements', ['sparepart_id' => $id, 'qty' => $d['stock'], 'type' => 'MASUK', 'note' => 'Stok awal', 'created_at' => now()]);
        return $id;
    });
    http_response_code(201);
    return ['message' => "Sparepart {$d['name']} ditambahkan", 'id' => $id];
}

function api_spareparts_update(int $id): array
{
    require_user(['OWNER', 'ADMIN']);
    if (!val('SELECT COUNT(*) FROM spareparts WHERE id = ?', [$id])) throw new HttpError(404, 'Sparepart tidak ditemukan.');
    update('spareparts', $id, sparepart_input($id) + ['updated_at' => now()]);
    return ['message' => 'Sparepart disimpan'];
}

function api_spareparts_delete(int $id): array
{
    require_user(['OWNER']);
    if (val('SELECT COUNT(*) FROM service_items WHERE sparepart_id = ?', [$id])) {
        throw new HttpError(422, 'Sparepart sudah pernah dipakai servis, tidak bisa dihapus');
    }
    q('DELETE FROM spareparts WHERE id = ?', [$id]);
    return ['message' => 'Sparepart dihapus'];
}

/** MASUK (+), KELUAR (−), PENYESUAIAN (stok opname: set stok = qty) */
function api_spareparts_adjust(int $id): array
{
    require_user(['OWNER', 'ADMIN']);
    $d = validate(body(), [
        'type' => 'required|in:MASUK,KELUAR,PENYESUAIAN',
        'qty' => 'required|int|min:0',
        'note' => 'nullable|string|max:255',
    ]);
    return tx(function () use ($d, $id) {
        $p = row('SELECT * FROM spareparts WHERE id = ? FOR UPDATE', [$id]);
        if (!$p) throw new HttpError(404, 'Sparepart tidak ditemukan.');
        $delta = $d['type'] === 'MASUK' ? $d['qty'] : ($d['type'] === 'KELUAR' ? -$d['qty'] : $d['qty'] - $p['stock']);
        $delta = max($delta, -$p['stock']);
        if ($delta === 0) return ['message' => 'Tidak ada perubahan stok'];
        q('UPDATE spareparts SET stock = stock + ?, updated_at = ? WHERE id = ?', [$delta, now(), $id]);
        insert('stock_movements', ['sparepart_id' => $id, 'qty' => $delta, 'type' => $d['type'], 'note' => $d['note'] ?? null, 'created_at' => now()]);
        return ['message' => "Stok {$p['name']}: {$p['stock']} → " . ($p['stock'] + $delta)];
    });
}
