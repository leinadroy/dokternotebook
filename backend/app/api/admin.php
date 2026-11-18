<?php
defined('DN_ROOT') or exit;

/* ---------------------------------------------------------------- Pengguna */

function api_users_index(): array
{
    require_user(['OWNER']);
    return array_map(
        fn ($u) => ['active' => (bool) $u['active']] + $u,
        rows('SELECT id, name, username, role, phone, active FROM users ORDER BY active DESC, role, name')
    );
}

function user_input(?int $id): array
{
    $in = body();
    $in['username'] = strtolower(trim((string) ($in['username'] ?? '')));
    $d = validate($in, [
        'name' => 'required|string|max:255',
        'username' => 'required|string|max:50',
        'role' => 'required|in:OWNER,ADMIN,TEKNISI',
        'phone' => 'nullable|string|max:30',
        'active' => 'nullable|bool',
        'password' => ($id ? 'nullable' : 'required') . '|string|min:6',
    ]);
    if (!preg_match('/^[a-z0-9_.-]+$/', $d['username'])) throw new HttpError(422, 'Username hanya boleh huruf kecil, angka, titik, strip, atau garis bawah.');
    if (val('SELECT COUNT(*) FROM users WHERE username = ? AND id <> ?', [$d['username'], $id ?? 0])) throw new HttpError(422, 'Username sudah dipakai');
    $d['active'] = !empty($d['active']) ? 1 : 0;
    if (!empty($d['password'])) $d['password'] = password_hash($d['password'], PASSWORD_BCRYPT);
    else unset($d['password']);
    return $d;
}

function api_users_store(): array
{
    require_user(['OWNER']);
    insert('users', user_input(null) + ['created_at' => now(), 'updated_at' => now()]);
    http_response_code(201);
    return ['message' => 'Pengguna ditambahkan'];
}

function api_users_update(int $id): array
{
    $me = require_user(['OWNER']);
    if (!val('SELECT COUNT(*) FROM users WHERE id = ?', [$id])) throw new HttpError(404, 'Pengguna tidak ditemukan.');
    $d = user_input($id);
    if ($id === (int) $me['id'] && (!$d['active'] || $d['role'] !== 'OWNER')) {
        throw new HttpError(422, 'Tidak bisa menonaktifkan / menurunkan peran akun sendiri');
    }
    update('users', $id, $d + ['updated_at' => now()]);
    return ['message' => 'Pengguna disimpan'];
}

/* ---------------------------------------------------------------- Pengaturan */

function api_settings_public(): array
{
    $s = settings();
    unset($s['fonnte_token']);
    return $s;
}

function api_settings_show(): array
{
    require_user(['OWNER']);
    return settings();
}

function api_settings_update(): array
{
    require_user(['OWNER']);
    $d = validate(body(), [
        'store_name' => 'required|string|max:100',
        'store_tagline' => 'nullable|string|max:150',
        'store_address' => 'nullable|string|max:255',
        'store_phone' => 'nullable|string|max:50',
        'default_warranty_days' => 'required|int|min:0|max:3650',
        'receipt_footer' => 'nullable|string|max:5000',
        'wa_template' => 'nullable|string|max:5000',
        'public_url' => 'nullable|url|max:255',
        'fonnte_token' => 'nullable|string|max:255',
        'booking_enabled' => 'nullable|bool',
        'booking_pickup' => 'nullable|bool',
        'booking_slots' => 'nullable|string|max:500',
        'booking_closed_days' => 'nullable|string|max:20',
        'booking_intro' => 'nullable|string|max:1000',
        'booking_wa_template' => 'nullable|string|max:2000',
    ]);
    $d['booking_enabled'] = !empty($d['booking_enabled']) ? '1' : '0';
    $d['booking_pickup'] = !empty($d['booking_pickup']) ? '1' : '0';
    $slots = array_values(array_filter(array_map('trim', explode(',', (string) ($d['booking_slots'] ?? '')))));
    if ($d['booking_enabled'] === '1' && !$slots) throw new HttpError(422, 'Isi minimal satu jam booking, mis. 09.00 - 12.00');
    $d['booking_slots'] = implode(',', $slots);
    $days = array_unique(array_filter(explode(',', preg_replace('/[^0-6,]/', '', (string) ($d['booking_closed_days'] ?? ''))), fn ($x) => $x !== ''));
    sort($days);
    $d['booking_closed_days'] = implode(',', $days);
    foreach (SETTING_KEYS as $k) {
        q('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [$k, (string) ($d[$k] ?? '')]);
    }
    return ['message' => 'Pengaturan disimpan'];
}

/* ---------------------------------------------------------------- Cek status publik */

/** Pelanggan cek status: nomor nota + 4 digit terakhir no HP */
function api_public_cek(): array
{
    // batasi 30 pencarian per menit per sesi
    $_SESSION['cek'] = array_filter($_SESSION['cek'] ?? [], fn ($t) => $t > time() - 60);
    if (count($_SESSION['cek']) >= 30) throw new HttpError(429, 'Terlalu banyak permintaan. Coba lagi sebentar.');
    $_SESSION['cek'][] = time();

    $nota = strtoupper(trim((string) query('nota')));
    $hp = preg_replace('/\D/', '', (string) query('hp'));
    $s = $nota ? row('SELECT s.*, c.name c_name, c.phone c_phone FROM services s JOIN customers c ON c.id = s.customer_id WHERE s.number = ?', [$nota]) : null;
    if (!$s || strlen($hp) < 4 || substr($s['c_phone'], -4) !== substr($hp, -4)) {
        throw new HttpError(404, 'Data tidak ditemukan. Periksa nomor nota dan 4 digit terakhir nomor HP Anda.');
    }
    $t = totals(
        rows('SELECT qty, price FROM service_items WHERE service_id = ?', [$s['id']]),
        rows('SELECT amount, type FROM payments WHERE service_id = ?', [$s['id']]),
        (int) $s['discount']
    );
    return [
        'number' => $s['number'],
        'status' => $s['status'],
        'device' => $s['device_brand'] . ' ' . $s['device_model'],
        'customer_name' => $s['c_name'],
        'complaint' => $s['complaint'],
        'diagnosis' => $s['diagnosis'],
        'received_at' => iso($s['received_at']),
        'estimated_done' => $s['estimated_done'],
        'estimated_cost' => $s['estimated_cost'],
        'total' => $t['total'],
        'remaining' => $t['remaining'],
        'warranty' => warranty($s),
        'logs' => array_map(fn ($l) => ['status' => $l['status'], 'created_at' => iso($l['created_at'])], rows('SELECT status, created_at FROM service_logs WHERE service_id = ? ORDER BY id', [$s['id']])),
    ];
}

/** Halaman diagnosa: /api/health — membantu saat pemasangan di hosting */
function api_health(): array
{
    $out = ['app' => 'Dokter Notebook', 'php' => PHP_VERSION, 'php_ok' => version_compare(PHP_VERSION, '8.0.0', '>=')];
    $out['pdo_mysql'] = extension_loaded('pdo_mysql');
    $out['config'] = is_file(DN_ROOT . '/config.php');
    $out['logs_writable'] = is_writable(DN_ROOT . '/logs');
    try {
        db();
        $out['database'] = 'OK';
        $out['tables'] = (int) val('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()');
        $out['users'] = $out['tables'] ? (int) val('SELECT COUNT(*) FROM users') : 0;
        if ($out['tables'] < 9) $out['hint'] = 'Tabel belum lengkap. Import file database.sql lewat phpMyAdmin.';
        elseif (!val("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'bookings'")) {
            $out['hint'] = 'Tabel booking belum ada. Import file update-booking.sql lewat phpMyAdmin.';
        }
    } catch (Throwable $e) {
        $out['database'] = 'GAGAL';
        $out['hint'] = $e->getMessage();
    }
    return $out;
}
