<?php
defined('DN_ROOT') or exit;

function api_dashboard(): array
{
    $u = require_user();
    $isTech = $u['role'] === 'TEKNISI';
    $scope = $isTech ? ' AND s.technician_id = ' . (int) $u['id'] : '';
    $open = in_list(OPEN_STATUSES);
    $income = fn ($from) => (int) val("SELECT COALESCE(SUM(CASE WHEN type='REFUND' THEN -amount ELSE amount END),0) FROM payments WHERE created_at >= ?", [$from]);

    $counts = [];
    foreach (rows("SELECT status, COUNT(*) c FROM services s WHERE 1 $scope GROUP BY status") as $r) $counts[$r['status']] = (int) $r['c'];

    $recent = rows(
        "SELECT s.id, s.number, s.device_brand, s.device_model, s.status, s.received_at, c.name customer_name, t.name tech_name
         FROM services s JOIN customers c ON c.id = s.customer_id LEFT JOIN users t ON t.id = s.technician_id
         WHERE s.status IN ($open) $scope ORDER BY s.received_at DESC LIMIT 10"
    );
    $recent = array_map(fn ($r) => [
        'id' => $r['id'], 'number' => $r['number'], 'device_brand' => $r['device_brand'], 'device_model' => $r['device_model'],
        'status' => $r['status'], 'received_at' => iso($r['received_at']),
        'customer' => ['name' => $r['customer_name']],
        'technician' => $r['tech_name'] ? ['name' => $r['tech_name']] : null,
    ], $recent);

    return [
        'counts' => (object) $counts,
        'open_count' => array_sum(array_intersect_key($counts, array_flip(OPEN_STATUSES))),
        'ready_count' => (int) val("SELECT COUNT(*) FROM services WHERE status = 'SELESAI'"),
        'today_in' => (int) val('SELECT COUNT(*) FROM services WHERE received_at >= ?', [date('Y-m-d 00:00:00')]),
        'income_today' => $isTech ? null : $income(date('Y-m-d 00:00:00')),
        'income_month' => $isTech ? null : $income(date('Y-m-01 00:00:00')),
        'overdue' => (int) val("SELECT COUNT(*) FROM services s WHERE s.status IN ($open) AND s.estimated_done < CURDATE() $scope"),
        'recent' => $recent,
        'low_stock' => rows('SELECT id, name, stock, min_stock FROM spareparts WHERE stock <= min_stock ORDER BY stock LIMIT 6'),
    ];
}

function api_technicians(): array
{
    require_user();
    return rows("SELECT id, name FROM users WHERE role = 'TEKNISI' AND active = 1 ORDER BY name");
}
