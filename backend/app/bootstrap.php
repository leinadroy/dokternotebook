<?php
/**
 * Inti aplikasi: konfigurasi, penanganan error, koneksi database, sesi & CSRF, helper HTTP.
 * PHP biasa tanpa framework — cukup PHP 7.4+ dengan ekstensi pdo_mysql.
 */
defined('DN_ROOT') or exit;

/* ---------------------------------------------------------------- config */

function config(?string $key = null)
{
    static $cfg = null;
    if ($cfg === null) {
        $file = DN_ROOT . '/config.php';
        if (!is_file($file)) {
            throw new HttpError(500, 'File config.php belum ada. Salin config.example.php menjadi config.php lalu isi data database.');
        }
        $cfg = require $file;
    }
    if ($key === null) return $cfg;
    $v = $cfg;
    foreach (explode('.', $key) as $k) $v = $v[$k] ?? null;
    return $v;
}

/* ---------------------------------------------------------------- error */

class HttpError extends Exception
{
    public $status;
    public $errors;

    public function __construct(int $status, string $message, ?array $errors = null)
    {
        parent::__construct($message);
        $this->status = $status;
        $this->errors = $errors;
    }
}

function log_error(string $msg): void
{
    @file_put_contents(DN_ROOT . '/logs/error.log', '[' . date('Y-m-d H:i:s') . "] $msg\n", FILE_APPEND);
}

function handle_exception(Throwable $e): void
{
    if ($e instanceof HttpError) {
        $body = ['message' => $e->getMessage()];
        if ($e->errors) $body['errors'] = $e->errors;
        json($body, $e->status);
        return;
    }
    log_error(get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $debug = false;
    try { $debug = (bool) config('debug'); } catch (Throwable $_) {}
    json(['message' => $debug ? $e->getMessage() : 'Terjadi kesalahan di server. Detail tercatat di logs/error.log'], 500);
}

/* ---------------------------------------------------------------- database */

function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = config('db');
    try {
        $pdo = new PDO(
            sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['host'], $c['port'] ?? 3306, $c['name']),
            $c['user'],
            $c['pass'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_STRINGIFY_FETCHES => false,
            ]
        );
        $pdo->exec("SET time_zone = '" . date('P') . "'");
    } catch (PDOException $e) {
        log_error('DB connect: ' . $e->getMessage());
        throw new HttpError(500, 'Database tidak dapat dihubungi. Periksa nama database, user, dan password di config.php.');
    }
    return $pdo;
}

function q(string $sql, array $params = []): PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st;
}

function rows(string $sql, array $params = []): array { return q($sql, $params)->fetchAll(); }
function row(string $sql, array $params = []): ?array { $r = q($sql, $params)->fetch(); return $r ?: null; }
function val(string $sql, array $params = []) { $v = q($sql, $params)->fetchColumn(); return $v === false ? null : $v; }

function insert(string $table, array $data): int
{
    $cols = array_keys($data);
    q(
        "INSERT INTO `$table` (`" . implode('`,`', $cols) . '`) VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')',
        array_values($data)
    );
    return (int) db()->lastInsertId();
}

function update(string $table, int $id, array $data): void
{
    if (!$data) return;
    $set = implode(',', array_map(fn ($c) => "`$c` = ?", array_keys($data)));
    q("UPDATE `$table` SET $set WHERE id = ?", [...array_values($data), $id]);
}

function tx(callable $fn)
{
    db()->beginTransaction();
    try {
        $r = $fn();
        db()->commit();
        return $r;
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }
}

/** Tanggal/waktu MySQL -> ISO 8601 untuk frontend */
function iso(?string $dt): ?string
{
    return $dt ? date('c', strtotime($dt)) : null;
}

function now(): string { return date('Y-m-d H:i:s'); }

/* ---------------------------------------------------------------- HTTP */

function json($data, int $status = 200): void
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function body(): array
{
    static $b = null;
    if ($b === null) {
        $raw = file_get_contents('php://input');
        $b = $raw ? (json_decode($raw, true) ?: []) : [];
    }
    return $b;
}

function query(string $k): ?string
{
    $v = $_GET[$k] ?? null;
    return is_string($v) && trim($v) !== '' ? trim($v) : null;
}

/* ---------------------------------------------------------------- sesi, login & CSRF */

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    $dir = DN_ROOT . '/logs/sessions';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    if (is_dir($dir) && is_writable($dir)) session_save_path($dir);
    ini_set('session.gc_maxlifetime', '43200');
    ini_set('session.use_strict_mode', '1');
    session_name('dn_session');
    session_set_cookie_params(['lifetime' => 43200, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

/** Token CSRF disimpan di sesi dan dikirim ke browser lewat cookie XSRF-TOKEN (dibaca JS, dikirim balik di header) */
function csrf_cookie(): void
{
    start_session();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    setcookie('XSRF-TOKEN', $_SESSION['csrf'], ['expires' => time() + 43200, 'path' => '/', 'secure' => $https, 'httponly' => false, 'samesite' => 'Lax']);
}

function verify_csrf(): void
{
    $sent = $_SERVER['HTTP_X_XSRF_TOKEN'] ?? '';
    if (empty($_SESSION['csrf']) || !is_string($sent) || !hash_equals($_SESSION['csrf'], $sent)) {
        // Kode 403 standar (sebagian web server mengubah kode 419 menjadi 500); frontend mengenali 'csrf' lalu mencoba ulang
        throw new HttpError(403, 'Sesi kedaluwarsa, silakan coba lagi.', ['csrf' => ['expired']]);
    }
}

function current_user(): ?array
{
    static $u = false;
    if ($u !== false) return $u;
    $u = null;
    if (!empty($_SESSION['uid'])) {
        $u = row('SELECT id, name, username, role, active FROM users WHERE id = ?', [$_SESSION['uid']]);
        if (!$u || !$u['active']) {
            $u = null;
            unset($_SESSION['uid']);
        } else {
            unset($u['active']);
        }
    }
    return $u;
}

function require_user(array $roles = []): array
{
    $u = current_user();
    if (!$u) throw new HttpError(401, 'Silakan login terlebih dahulu.');
    if ($roles && !in_array($u['role'], $roles, true)) throw new HttpError(403, 'Anda tidak punya akses untuk tindakan ini.');
    return $u;
}

function is_manager(array $u): bool { return in_array($u['role'], ['OWNER', 'ADMIN'], true); }
