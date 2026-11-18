<?php
/**
 * DOKTER NOTEBOOK — pintu masuk aplikasi (PHP biasa, tanpa framework).
 *   /api/*                 -> REST API (JSON)
 *   /sanctum/csrf-cookie   -> kirim cookie token CSRF ke browser
 *   selain itu             -> tampilan aplikasi (spa.html hasil build SvelteKit)
 */
define('DN_ROOT', __DIR__);

require DN_ROOT . '/app/bootstrap.php';
require DN_ROOT . '/app/validate.php';
require DN_ROOT . '/app/domain.php';
foreach (glob(DN_ROOT . '/app/api/*.php') as $f) require $f;

set_exception_handler('handle_exception');
set_error_handler(function ($no, $msg, $file, $line) {
    if (!(error_reporting() & $no)) return false;
    throw new ErrorException($msg, 0, $no, $file, $line);
});
ini_set('display_errors', '0');

$path = '/' . trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// Saat dijalankan dengan "php -S" (development), biarkan server melayani file statis yang ada
if (PHP_SAPI === 'cli-server' && $path !== '/' && is_file(DN_ROOT . $path)) {
    return false;
}

/* ---------------------------------------------------------------- tampilan (SPA) */
if ($path !== '/sanctum/csrf-cookie' && strpos($path . '/', '/api/') !== 0) {
    $spa = DN_ROOT . '/spa.html';
    if (!is_file($spa)) {
        http_response_code(503);
        echo 'Tampilan belum dibuild. Jalankan "npm run build" di folder frontend.';
        exit;
    }
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    readfile($spa);
    exit;
}

/* ---------------------------------------------------------------- API */
date_default_timezone_set('Asia/Jakarta');
try {
    date_default_timezone_set(config('timezone') ?: 'Asia/Jakarta');
} catch (Throwable $e) {
    // config.php belum ada: tetap lanjut agar /api/health bisa memberi petunjuk
}
start_session();

if ($path === '/sanctum/csrf-cookie') {
    csrf_cookie();
    http_response_code(204);
    exit;
}

// [method, pola path, fungsi]  — {id} = angka
$routes = [
    ['GET', '/api/health', 'api_health'],
    ['POST', '/api/login', 'api_login'],
    ['GET', '/api/public/settings', 'api_settings_public'],
    ['GET', '/api/public/cek', 'api_public_cek'],
    ['GET', '/api/public/booking-info', 'api_public_booking_info'],
    ['POST', '/api/public/booking', 'api_public_booking_store'],
    ['GET', '/api/public/booking', 'api_public_booking_check'],

    ['GET', '/api/bookings', 'api_bookings_index'],
    ['GET', '/api/bookings/{id}', 'api_bookings_show'],
    ['PUT', '/api/bookings/{id}', 'api_bookings_update'],

    ['GET', '/api/me', 'api_me'],
    ['POST', '/api/logout', 'api_logout'],
    ['POST', '/api/me/password', 'api_change_password'],
    ['GET', '/api/dashboard', 'api_dashboard'],
    ['GET', '/api/technicians', 'api_technicians'],

    ['GET', '/api/services', 'api_services_index'],
    ['POST', '/api/services', 'api_services_store'],
    ['GET', '/api/services/{id}', 'api_services_show'],
    ['PUT', '/api/services/{id}', 'api_services_update'],
    ['POST', '/api/services/{id}/status', 'api_services_status'],
    ['POST', '/api/services/{id}/items', 'api_services_add_item'],
    ['POST', '/api/services/{id}/payments', 'api_services_add_payment'],
    ['DELETE', '/api/items/{id}', 'api_items_delete'],
    ['DELETE', '/api/payments/{id}', 'api_payments_delete'],

    ['GET', '/api/customers', 'api_customers_index'],
    ['GET', '/api/customers/lookup', 'api_customers_lookup'],
    ['GET', '/api/customers/{id}', 'api_customers_show'],
    ['PUT', '/api/customers/{id}', 'api_customers_update'],

    ['GET', '/api/spareparts', 'api_spareparts_index'],
    ['POST', '/api/spareparts', 'api_spareparts_store'],
    ['PUT', '/api/spareparts/{id}', 'api_spareparts_update'],
    ['DELETE', '/api/spareparts/{id}', 'api_spareparts_delete'],
    ['POST', '/api/spareparts/{id}/stock', 'api_spareparts_adjust'],
    ['GET', '/api/stock-movements', 'api_stock_movements'],

    ['GET', '/api/warranty', 'api_warranty'],
    ['GET', '/api/reports', 'api_reports'],

    ['GET', '/api/users', 'api_users_index'],
    ['POST', '/api/users', 'api_users_store'],
    ['PUT', '/api/users/{id}', 'api_users_update'],
    ['GET', '/api/settings', 'api_settings_show'],
    ['PUT', '/api/settings', 'api_settings_update'],
];

// Semua permintaan yang mengubah data wajib membawa token CSRF.
// Pengecualian: kirim booking publik (tanpa login, bisa dari form yang disematkan di situs lain);
// dilindungi batas per IP + jebakan bot di api_public_booking_store().
$csrfExempt = $method === 'POST' && $path === '/api/public/booking';
if (!$csrfExempt && !in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
    try {
        verify_csrf();
    } catch (Throwable $e) {
        handle_exception($e);
        exit;
    }
}

$pathMatched = false;
foreach ($routes as [$m, $pattern, $fn]) {
    $regex = '#^' . str_replace('{id}', '(\d+)', $pattern) . '$#';
    if (!preg_match($regex, $path, $mm)) continue;
    $pathMatched = true;
    if ($m !== $method) continue;
    $args = array_map('intval', array_slice($mm, 1));
    try {
        $result = $fn(...$args);
        json($result, http_response_code() ?: 200);
    } catch (Throwable $e) {
        if (db_in_tx()) db()->rollBack();
        handle_exception($e);
    }
    exit;
}

json(['message' => $pathMatched ? 'Metode tidak diizinkan.' : 'Endpoint tidak ditemukan.'], $pathMatched ? 405 : 404);

function db_in_tx(): bool
{
    try {
        return db()->inTransaction();
    } catch (Throwable $e) {
        return false;
    }
}
