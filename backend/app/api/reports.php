<?php
defined('DN_ROOT') or exit;

function api_warranty(): array
{
    require_user(['OWNER', 'ADMIN']);
    $found = [];
    if ($term = query('q')) {
        $p = ['%' . strtoupper($term) . '%', "%$term%", "%$term%"];
        $cond = 's.number LIKE ? OR s.serial_number LIKE ? OR c.name LIKE ?';
        if (($ph = phone_term($term)) !== '') { $cond .= ' OR c.phone LIKE ?'; $p[] = "%$ph%"; }
        $list = rows("SELECT s.*, c.name c_name FROM services s JOIN customers c ON c.id = s.customer_id WHERE $cond ORDER BY s.received_at DESC LIMIT 30", $p);
        $claims = [];
        if ($list) {
            $ids = implode(',', array_column($list, 'id'));
            foreach (rows("SELECT id, number, status, parent_id FROM services WHERE parent_id IN ($ids)") as $c) $claims[$c['parent_id']][] = $c;
        }
        foreach ($list as $s) {
            $found[] = ['customer' => ['name' => $s['c_name']], 'claims' => $claims[$s['id']] ?? [], 'warranty' => warranty($s)] + service_out($s);
        }
    }

    $active = [];
    $since = date('Y-m-d H:i:s', strtotime('-1 year'));
    foreach (rows("SELECT s.*, c.name c_name FROM services s JOIN customers c ON c.id = s.customer_id WHERE s.status = 'DIAMBIL' AND s.warranty_days > 0 AND s.picked_up_at >= ? ORDER BY s.picked_up_at DESC", [$since]) as $s) {
        $w = warranty($s);
        if ($w['active']) $active[] = ['customer' => ['name' => $s['c_name']], 'warranty' => $w] + service_out($s);
        if (count($active) >= 30) break;
    }

    $claims = array_map(fn ($s) => [
        'customer' => ['name' => $s['c_name']],
        'parent' => $s['parent_id'] ? ['id' => $s['parent_id'], 'number' => $s['p_number']] : null,
    ] + service_out($s), rows(
        'SELECT s.*, c.name c_name, p.number p_number FROM services s JOIN customers c ON c.id = s.customer_id LEFT JOIN services p ON p.id = s.parent_id
         WHERE s.is_warranty_claim = 1 ORDER BY s.received_at DESC LIMIT 20'
    ));

    foreach ([&$found, &$active, &$claims] as &$arr) foreach ($arr as &$x) unset($x['c_name'], $x['p_number'], $x['device_password']);
    return ['found' => $found, 'active' => $active, 'claims' => $claims];
}

function api_reports(): array
{
    require_user(['OWNER', 'ADMIN']);
    $fromD = query('from') ?: date('Y-m-01');
    $toD = query('to') ?: date('Y-m-d');
    if (!strtotime($fromD) || !strtotime($toD)) throw new HttpError(422, 'Tanggal tidak valid.');
    $from = date('Y-m-d 00:00:00', strtotime($fromD));
    $to = date('Y-m-d 23:59:59', strtotime($toD));
    $range = [$from, $to];

    $daily = [];
    for ($d = strtotime(substr($from, 0, 10)); $d <= strtotime(substr($to, 0, 10)); $d = strtotime('+1 day', $d)) $daily[date('Y-m-d', $d)] = 0;
    $byMethod = [];
    $income = 0;
    foreach (rows('SELECT amount, type, method, created_at FROM payments WHERE created_at BETWEEN ? AND ?', $range) as $p) {
        $amt = $p['type'] === 'REFUND' ? -$p['amount'] : $p['amount'];
        $income += $amt;
        $k = substr($p['created_at'], 0, 10);
        if (isset($daily[$k])) $daily[$k] += $amt;
        $byMethod[$p['method']] = ($byMethod[$p['method']] ?? 0) + $amt;
    }

    $it = row(
        "SELECT COALESCE(SUM(CASE WHEN type='JASA' THEN qty*price END),0) jasa,
                COALESCE(SUM(CASE WHEN type='PART' THEN qty*price END),0) part_sales,
                COALESCE(SUM(CASE WHEN type='PART' THEN qty*cost_price END),0) part_cost
         FROM service_items WHERE created_at BETWEEN ? AND ?",
        $range
    );

    $statusCounts = [];
    foreach (rows('SELECT status, COUNT(*) c FROM services WHERE received_at BETWEEN ? AND ? GROUP BY status', $range) as $r) $statusCounts[$r['status']] = (int) $r['c'];

    $perTech = array_map(fn ($t) => ['name' => $t['name'], 'count' => (int) $t['cnt'], 'jasa' => (int) $t['jasa']], rows(
        "SELECT u.name,
                (SELECT COUNT(*) FROM services s WHERE s.technician_id = u.id AND s.finished_at BETWEEN ? AND ?) cnt,
                (SELECT COALESCE(SUM(i.qty*i.price),0) FROM service_items i JOIN services s ON s.id = i.service_id
                  WHERE i.type='JASA' AND s.technician_id = u.id AND s.finished_at BETWEEN ? AND ?) jasa
         FROM users u WHERE u.role = 'TEKNISI' ORDER BY u.name",
        [$from, $to, $from, $to]
    ));

    $topParts = array_map(fn ($r) => ['name' => $r['name'], 'qty' => (int) $r['qty'], 'omzet' => (int) $r['omzet']], rows(
        "SELECT MAX(description) name, SUM(qty) qty, SUM(qty*price) omzet FROM service_items
         WHERE type='PART' AND created_at BETWEEN ? AND ? GROUP BY sparepart_id ORDER BY qty DESC LIMIT 10",
        $range
    ));

    $done = rows("SELECT s.id, s.number, s.status, s.discount, c.name customer FROM services s JOIN customers c ON c.id = s.customer_id WHERE s.status IN ('SELESAI','DIAMBIL')");
    $tot = totals_for($done);
    $piutang = [];
    foreach ($done as $s) {
        if ($tot[$s['id']]['remaining'] > 0) {
            $piutang[] = ['id' => $s['id'], 'number' => $s['number'], 'customer' => $s['customer'], 'status' => $s['status'], 'remaining' => $tot[$s['id']]['remaining']];
        }
    }

    return [
        'from' => substr($from, 0, 10),
        'to' => substr($to, 0, 10),
        'income' => $income,
        'received' => (int) val('SELECT COUNT(*) FROM services WHERE received_at BETWEEN ? AND ?', $range),
        'finished' => (int) val('SELECT COUNT(*) FROM services WHERE finished_at BETWEEN ? AND ?', $range),
        'jasa' => (int) $it['jasa'],
        'part_sales' => (int) $it['part_sales'],
        'part_cost' => (int) $it['part_cost'],
        'by_method' => (object) $byMethod,
        'daily' => (object) $daily,
        'status_counts' => (object) $statusCounts,
        'per_tech' => $perTech,
        'top_parts' => $topParts,
        'piutang' => $piutang,
    ];
}
