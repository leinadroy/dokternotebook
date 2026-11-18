<?php
defined('DN_ROOT') or exit;

function find_service(int $id): array
{
    $s = row('SELECT * FROM services WHERE id = ?', [$id]);
    if (!$s) throw new HttpError(404, 'Data servis tidak ditemukan.');
    return $s;
}

function api_services_index(): array
{
    $u = require_user();
    $where = ['1'];
    $p = [];
    $status = query('status');
    if ($status === 'AKTIF') $where[] = 's.status IN (' . in_list(OPEN_STATUSES) . ')';
    elseif ($status) { $where[] = 's.status = ?'; $p[] = $status; }

    if ($u['role'] === 'TEKNISI') {
        $where[] = '(s.technician_id = ? OR s.technician_id IS NULL)';
        $p[] = $u['id'];
    } elseif ($tech = query('tech')) {
        if ($tech === 'none') $where[] = 's.technician_id IS NULL';
        else { $where[] = 's.technician_id = ?'; $p[] = (int) $tech; }
    }
    if ($term = query('q')) {
        $like = "%$term%";
        $cond = 's.number LIKE ? OR s.device_brand LIKE ? OR s.device_model LIKE ? OR s.serial_number LIKE ? OR c.name LIKE ?';
        array_push($p, $like, $like, $like, $like, $like);
        if (($ph = phone_term($term)) !== '') { $cond .= ' OR c.phone LIKE ?'; $p[] = "%$ph%"; }
        $where[] = "($cond)";
    }
    $w = implode(' AND ', $where);
    $from = "FROM services s JOIN customers c ON c.id = s.customer_id LEFT JOIN users t ON t.id = s.technician_id WHERE $w";

    $per = 25;
    $total = (int) val("SELECT COUNT(*) $from", $p);
    $last = max(1, (int) ceil($total / $per));
    $page = min(max(1, (int) (query('page') ?? 1)), $last);
    $list = rows("SELECT s.*, c.name c_name, c.phone c_phone, t.name t_name $from ORDER BY s.received_at DESC, s.id DESC LIMIT $per OFFSET " . (($page - 1) * $per), $p);
    $tot = totals_for($list);

    $data = array_map(function ($s) use ($tot) {
        $out = service_out($s);
        $out['customer'] = ['id' => $s['customer_id'], 'name' => $s['c_name'], 'phone' => $s['c_phone']];
        $out['technician'] = $s['technician_id'] ? ['id' => $s['technician_id'], 'name' => $s['t_name']] : null;
        $out['totals'] = $tot[$s['id']];
        unset($out['c_name'], $out['c_phone'], $out['t_name'], $out['device_password']);
        return $out;
    }, $list);

    return ['data' => $data, 'total' => $total, 'current_page' => $page, 'last_page' => $last, 'per_page' => $per];
}

function api_services_store(): array
{
    $u = require_user(['OWNER', 'ADMIN']);
    $d = validate(body(), [
        'phone' => 'required|string|max:30',
        'customer_name' => 'required|string|max:255',
        'address' => 'nullable|string|max:255',
        'email' => 'nullable|email|max:255',
        'device_type' => 'nullable|string|max:30',
        'device_brand' => 'required|string|max:50',
        'device_model' => 'required|string|max:100',
        'serial_number' => 'nullable|string|max:100',
        'device_password' => 'nullable|string|max:100',
        'complaint' => 'required|string|max:5000',
        'accessories' => 'nullable|string|max:255',
        'physical_condition' => 'nullable|string|max:255',
        'technician_id' => 'nullable|int|exists:users',
        'estimated_cost' => 'nullable|int|min:0',
        'estimated_done' => 'nullable|date',
        'down_payment' => 'nullable|int|min:0',
        'dp_method' => 'nullable|in:TUNAI,TRANSFER,QRIS,DEBIT',
        'warranty_days' => 'nullable|int|min:0|max:3650',
        'notes' => 'nullable|string|max:255',
        'parent_id' => 'nullable|int|exists:services',
    ]);
    $phone = norm_phone($d['phone']);
    if (strlen($phone) < 8) throw new HttpError(422, 'No. HP tidak valid.');

    $res = tx(function () use ($d, $u, $phone) {
        $c = row('SELECT * FROM customers WHERE phone = ?', [$phone]);
        if ($c) {
            $upd = ['name' => $d['customer_name'], 'updated_at' => now()];
            if (!empty($d['address'])) $upd['address'] = $d['address'];
            if (!empty($d['email'])) $upd['email'] = $d['email'];
            update('customers', (int) $c['id'], $upd);
            $cid = (int) $c['id'];
        } else {
            $cid = insert('customers', [
                'name' => $d['customer_name'], 'phone' => $phone, 'address' => $d['address'] ?? null,
                'email' => $d['email'] ?? null, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $parentId = $d['parent_id'] ?? null;
        $number = next_number();
        $id = insert('services', [
            'number' => $number,
            'customer_id' => $cid,
            'device_type' => $d['device_type'] ?? 'Laptop',
            'device_brand' => $d['device_brand'],
            'device_model' => $d['device_model'],
            'serial_number' => $d['serial_number'] ?? null,
            'device_password' => $d['device_password'] ?? null,
            'complaint' => $d['complaint'],
            'accessories' => $d['accessories'] ?? null,
            'physical_condition' => $d['physical_condition'] ?? null,
            'technician_id' => $d['technician_id'] ?? null,
            'created_by' => $u['id'],
            'estimated_cost' => $d['estimated_cost'] ?? 0,
            'estimated_done' => $d['estimated_done'] ?? null,
            'warranty_days' => $d['warranty_days'] ?? (int) (settings()['default_warranty_days'] ?? 30),
            'notes' => $d['notes'] ?? null,
            'is_warranty_claim' => $parentId ? 1 : 0,
            'parent_id' => $parentId,
            'received_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        insert('service_logs', ['service_id' => $id, 'status' => 'DITERIMA', 'note' => $parentId ? 'Klaim garansi - unit diterima' : 'Unit diterima', 'user_id' => $u['id'], 'created_at' => now()]);
        if (($d['down_payment'] ?? 0) > 0) {
            insert('payments', ['service_id' => $id, 'amount' => $d['down_payment'], 'type' => 'DP', 'method' => $d['dp_method'] ?? 'TUNAI', 'user_id' => $u['id'], 'created_at' => now()]);
        }
        return ['id' => $id, 'number' => $number];
    });
    http_response_code(201);
    return $res;
}

function api_services_show(int $id): array
{
    require_user();
    $s = find_service($id);
    $customer = row('SELECT * FROM customers WHERE id = ?', [$s['customer_id']]);
    $items = rows('SELECT * FROM service_items WHERE service_id = ? ORDER BY id', [$id]);
    $payments = rows('SELECT p.*, u.name user_name FROM payments p LEFT JOIN users u ON u.id = p.user_id WHERE p.service_id = ? ORDER BY p.id', [$id]);
    $logs = rows('SELECT l.*, u.name user_name FROM service_logs l LEFT JOIN users u ON u.id = l.user_id WHERE l.service_id = ? ORDER BY l.id DESC', [$id]);
    $t = totals($items, $payments, (int) $s['discount']);
    $set = settings();

    $out = service_out($s);
    $out['customer'] = service_out($customer);
    $out['technician'] = $s['technician_id'] ? row('SELECT id, name FROM users WHERE id = ?', [$s['technician_id']]) : null;
    $out['creator'] = $s['created_by'] ? row('SELECT id, name FROM users WHERE id = ?', [$s['created_by']]) : null;
    $out['parent'] = $s['parent_id'] ? row('SELECT id, number FROM services WHERE id = ?', [$s['parent_id']]) : null;
    $out['claims'] = rows('SELECT id, number, status FROM services WHERE parent_id = ? ORDER BY id', [$id]);
    $out['items'] = $items;
    $out['payments'] = array_map(fn ($p) => ['user' => $p['user_name'] ? ['name' => $p['user_name']] : null, 'created_at' => iso($p['created_at'])] + $p, $payments);
    $out['logs'] = array_map(fn ($l) => ['user' => $l['user_name'] ? ['name' => $l['user_name']] : null, 'created_at' => iso($l['created_at'])] + $l, $logs);

    $note = $s['status'] === 'SELESAI' && $t['remaining'] > 0 ? 'Total biaya ' . rp($t['total']) . ', sisa pembayaran ' . rp($t['remaining']) . '.' : '';
    return [
        'service' => $out,
        'totals' => $t,
        'warranty' => warranty($s),
        'wa_link' => wa_link($customer['phone'], wa_message($s, $customer, $set, $note)),
        'fonnte_active' => trim($set['fonnte_token'] ?? '') !== '',
    ];
}

function api_services_update(int $id): array
{
    $u = require_user();
    find_service($id);
    $rules = [
        'diagnosis' => 'nullable|string|max:5000',
        'notes' => 'nullable|string|max:255',
        'estimated_cost' => 'nullable|int|min:0',
        'estimated_done' => 'nullable|date',
    ];
    if (is_manager($u)) {
        $rules += [
            'technician_id' => 'nullable|int|exists:users',
            'warranty_days' => 'nullable|int|min:0|max:3650',
            'discount' => 'nullable|int|min:0',
            'device_brand' => 'required|string|max:50',
            'device_model' => 'required|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'device_password' => 'nullable|string|max:100',
            'complaint' => 'required|string|max:5000',
            'accessories' => 'nullable|string|max:255',
            'physical_condition' => 'nullable|string|max:255',
        ];
    }
    $d = validate(body(), $rules);
    foreach (['estimated_cost', 'warranty_days', 'discount'] as $k) {
        if (array_key_exists($k, $d) && $d[$k] === null) $d[$k] = 0;
    }
    $d['updated_at'] = now();
    update('services', $id, $d);
    return ['message' => 'Data servis disimpan'];
}

function api_services_status(int $id): array
{
    $u = require_user();
    $d = validate(body(), [
        'status' => 'required|in:' . implode(',', STATUSES),
        'note' => 'nullable|string|max:255',
        'send_wa' => 'nullable|bool',
        'force' => 'nullable|bool',
    ]);
    $s = find_service($id);
    if ($u['role'] === 'TEKNISI' && ($d['status'] === 'DIAMBIL' || (int) $s['technician_id'] !== (int) $u['id'])) {
        throw new HttpError(403, "Teknisi hanya bisa mengubah status servis yang ditugaskan kepadanya (kecuali 'Diambil').");
    }
    $items = rows('SELECT qty, price FROM service_items WHERE service_id = ?', [$id]);
    $pays = rows('SELECT amount, type FROM payments WHERE service_id = ?', [$id]);
    if ($d['status'] === 'DIAMBIL' && totals($items, $pays, (int) $s['discount'])['remaining'] > 0 && empty($d['force'])) {
        throw new HttpError(422, 'Masih ada sisa tagihan. Catat pelunasan dulu sebelum unit diambil.');
    }

    $upd = ['status' => $d['status'], 'updated_at' => now()];
    if ($d['status'] === 'SELESAI') $upd['finished_at'] = now();
    if ($d['status'] === 'DIAMBIL') {
        $upd['finished_at'] = $s['finished_at'] ?: now();
        $upd['picked_up_at'] = now();
    } else {
        $upd['picked_up_at'] = null;
    }
    update('services', $id, $upd);
    insert('service_logs', ['service_id' => $id, 'status' => $d['status'], 'note' => $d['note'] ?? null, 'user_id' => $u['id'], 'created_at' => now()]);

    $msg = 'Status diubah ke ' . STATUS_LABELS[$d['status']];
    if (!empty($d['send_wa'])) {
        $customer = row('SELECT * FROM customers WHERE id = ?', [$s['customer_id']]);
        $s['status'] = $d['status'];
        if (wa_send_auto($customer['phone'], wa_message($s, $customer, settings(), $d['note'] ?? ''), settings())) {
            $msg .= ' · WhatsApp terkirim otomatis';
        }
    }
    return ['message' => $msg];
}

function api_services_add_item(int $id): array
{
    require_user();
    find_service($id);
    $d = validate(body(), [
        'type' => 'required|in:JASA,PART',
        'description' => 'nullable|string|max:255',
        'sparepart_id' => 'nullable|int',
        'qty' => 'nullable|int|min:1',
        'price' => 'nullable|int|min:0',
    ]);
    $qty = $d['qty'] ?? 1;

    if ($d['type'] === 'PART') {
        if (empty($d['sparepart_id'])) throw new HttpError(422, 'Pilih sparepart.');
        return tx(function () use ($d, $qty, $id) {
            $part = row('SELECT * FROM spareparts WHERE id = ? FOR UPDATE', [$d['sparepart_id']]);
            if (!$part) throw new HttpError(422, 'Sparepart tidak ditemukan.');
            if ($part['stock'] < $qty) throw new HttpError(422, "Stok {$part['name']} tidak cukup (sisa {$part['stock']})");
            insert('service_items', [
                'service_id' => $id, 'type' => 'PART', 'sparepart_id' => $part['id'], 'description' => $part['name'], 'qty' => $qty,
                'price' => $d['price'] ?? $part['sell_price'], 'cost_price' => $part['buy_price'], 'created_at' => now(), 'updated_at' => now(),
            ]);
            q('UPDATE spareparts SET stock = stock - ?, updated_at = ? WHERE id = ?', [$qty, now(), $part['id']]);
            insert('stock_movements', ['sparepart_id' => $part['id'], 'qty' => -$qty, 'type' => 'KELUAR', 'service_id' => $id, 'note' => 'Dipakai servis', 'created_at' => now()]);
            return ['message' => 'Sparepart ditambahkan'];
        });
    }
    if (empty($d['description'])) throw new HttpError(422, 'Deskripsi jasa wajib diisi.');
    insert('service_items', ['service_id' => $id, 'type' => 'JASA', 'description' => $d['description'], 'qty' => $qty, 'price' => $d['price'] ?? 0, 'created_at' => now(), 'updated_at' => now()]);
    return ['message' => 'Jasa ditambahkan'];
}

function api_items_delete(int $itemId): array
{
    require_user();
    $item = row('SELECT * FROM service_items WHERE id = ?', [$itemId]);
    if (!$item) throw new HttpError(404, 'Item tidak ditemukan.');
    tx(function () use ($item) {
        if ($item['sparepart_id']) {
            q('UPDATE spareparts SET stock = stock + ?, updated_at = ? WHERE id = ?', [$item['qty'], now(), $item['sparepart_id']]);
            insert('stock_movements', ['sparepart_id' => $item['sparepart_id'], 'qty' => $item['qty'], 'type' => 'MASUK', 'service_id' => $item['service_id'], 'note' => 'Batal dipakai servis', 'created_at' => now()]);
        }
        q('DELETE FROM service_items WHERE id = ?', [$item['id']]);
    });
    return ['message' => 'Item dihapus'];
}

function api_services_add_payment(int $id): array
{
    $u = require_user(['OWNER', 'ADMIN']);
    find_service($id);
    $d = validate(body(), [
        'amount' => 'required|int|min:1',
        'method' => 'required|in:TUNAI,TRANSFER,QRIS,DEBIT',
        'type' => 'required|in:DP,PELUNASAN,REFUND',
        'note' => 'nullable|string|max:255',
    ]);
    insert('payments', $d + ['service_id' => $id, 'user_id' => $u['id'], 'created_at' => now()]);
    return ['message' => 'Pembayaran dicatat'];
}

function api_payments_delete(int $pid): array
{
    require_user(['OWNER']);
    q('DELETE FROM payments WHERE id = ?', [$pid]);
    return ['message' => 'Pembayaran dihapus'];
}
