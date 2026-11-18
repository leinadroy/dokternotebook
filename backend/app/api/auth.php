<?php
defined('DN_ROOT') or exit;

function api_login(): array
{
    $d = validate(body(), ['username' => 'required|string', 'password' => 'required|string']);
    // Batasi percobaan login: maks 10 kali gagal per 10 menit per sesi
    $_SESSION['login_fail'] = array_filter($_SESSION['login_fail'] ?? [], fn ($t) => $t > time() - 600);
    if (count($_SESSION['login_fail']) >= 10) {
        throw new HttpError(429, 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.');
    }
    $u = row('SELECT * FROM users WHERE username = ? AND active = 1', [strtolower($d['username'])]);
    if (!$u || !password_verify($d['password'], $u['password'])) {
        $_SESSION['login_fail'][] = time();
        throw new HttpError(422, 'Username atau password salah');
    }
    session_regenerate_id(true);
    $_SESSION['uid'] = (int) $u['id'];
    unset($_SESSION['login_fail']);
    return ['user' => ['id' => (int) $u['id'], 'name' => $u['name'], 'username' => $u['username'], 'role' => $u['role']]];
}

function api_me(): array
{
    return require_user();
}

function api_logout(): array
{
    unset($_SESSION['uid']);
    session_regenerate_id(true);
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return ['ok' => true];
}

function api_change_password(): array
{
    $u = require_user();
    $d = validate(body(), ['old' => 'required|string', 'new' => 'required|string|min:6']);
    $hash = val('SELECT password FROM users WHERE id = ?', [$u['id']]);
    if (!password_verify($d['old'], $hash)) throw new HttpError(422, 'Password lama salah');
    update('users', $u['id'], ['password' => password_hash($d['new'], PASSWORD_BCRYPT), 'updated_at' => now()]);
    return ['message' => 'Password berhasil diganti'];
}
