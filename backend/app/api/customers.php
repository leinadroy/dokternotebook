<?php
defined('DN_ROOT') or exit;

function api_customers_index(): array
{
    require_user();
    $where = '1';
    $p = [];
    if ($term = query('q')) {
        $where = '(c.name LIKE ? OR c.address LIKE ?';
        array_push($p, "%$term%", "%$term%");
        if (($ph = phone_term($term)) !== '') { $where .= ' OR c.phone LIKE ?'; $p[] = "%$ph%"; }
        $where .= ')';
    }
    $list = rows(
        "SELECT c.*, COUNT(s.id) services_count, MAX(s.received_at) services_max_received_at
         FROM customers c LEFT JOIN services s ON s.customer_id = c.id
         WHERE $where GROUP BY c.id ORDER BY c.created_at DESC LIMIT 100",
        $p
    );
    return array_map(fn ($c) => ['services_max_received_at' => iso($c['services_max_received_at']), 'created_at' => iso($c['created_at'])] + $c, $list);
}

/** Auto-isi form terima servis berdasarkan no HP */
function api_customers_lookup()
{
    require_user();
    $phone = norm_phone(query('phone'));
    if (strlen($phone) < 8) return null;
    return row('SELECT c.id, c.name, c.address, c.email, (SELECT COUNT(*) FROM services s WHERE s.customer_id = c.id) services_count FROM customers c WHERE c.phone = ?', [$phone]);
}

function api_customers_show(int $id): array
{
    require_user();
    $c = row('SELECT * FROM customers WHERE id = ?', [$id]);
    if (!$c) throw new HttpError(404, 'Pelanggan tidak ditemukan.');
    $services = rows('SELECT * FROM services WHERE customer_id = ? ORDER BY received_at DESC', [$id]);
    $tot = totals_for($services);
    $paid = 0;
    $out = [];
    foreach ($services as $s) {
        $paid += $tot[$s['id']]['paid'];
        unset($s['device_password']);
        $out[] = ['totals' => $tot[$s['id']]] + service_out($s);
    }
    return ['customer' => service_out($c), 'services' => $out, 'total_paid' => $paid];
}

function api_customers_update(int $id): array
{
    require_user(['OWNER', 'ADMIN']);
    $in = body();
    $in['phone'] = norm_phone($in['phone'] ?? '');
    $d = validate($in, [
        'name' => 'required|string|max:255',
        'phone' => 'required|string|max:30',
        'address' => 'nullable|string|max:255',
        'email' => 'nullable|email|max:255',
        'notes' => 'nullable|string|max:5000',
    ]);
    if (val('SELECT COUNT(*) FROM customers WHERE phone = ? AND id <> ?', [$d['phone'], $id])) {
        throw new HttpError(422, 'Nomor HP sudah dipakai pelanggan lain');
    }
    update('customers', $id, $d + ['updated_at' => now()]);
    return ['message' => 'Data pelanggan disimpan'];
}
