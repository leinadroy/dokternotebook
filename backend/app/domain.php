<?php
/** Aturan bisnis bersama: status, total biaya, garansi, nomor nota, WhatsApp, pengaturan */
defined('DN_ROOT') or exit;

const STATUSES = ['DITERIMA', 'DIAGNOSA', 'MENUNGGU_KONFIRMASI', 'MENUNGGU_SPAREPART', 'DIKERJAKAN', 'SELESAI', 'DIAMBIL', 'BATAL'];
const OPEN_STATUSES = ['DITERIMA', 'DIAGNOSA', 'MENUNGGU_KONFIRMASI', 'MENUNGGU_SPAREPART', 'DIKERJAKAN'];
const STATUS_LABELS = [
    'DITERIMA' => 'Diterima', 'DIAGNOSA' => 'Diagnosa', 'MENUNGGU_KONFIRMASI' => 'Menunggu Konfirmasi',
    'MENUNGGU_SPAREPART' => 'Menunggu Sparepart', 'DIKERJAKAN' => 'Dikerjakan', 'SELESAI' => 'Selesai',
    'DIAMBIL' => 'Diambil', 'BATAL' => 'Batal',
];
const SETTING_KEYS = [
    'store_name', 'store_tagline', 'store_address', 'store_phone', 'default_warranty_days',
    'receipt_footer', 'wa_template', 'public_url', 'fonnte_token',
];

function in_list(array $values): string
{
    return implode(',', array_map(fn ($v) => db()->quote($v), $values));
}

/** Normalisasi nomor HP Indonesia ke format 62xxxx */
function norm_phone(?string $p): string
{
    $s = preg_replace('/\D/', '', (string) $p);
    if (strpos($s, '0') === 0) $s = '62' . substr($s, 1);
    elseif (strpos($s, '8') === 0) $s = '62' . $s;
    return $s;
}

function settings(): array
{
    static $s = null;
    if ($s === null) {
        $s = [];
        foreach (rows('SELECT `key`, `value` FROM settings') as $r) $s[$r['key']] = $r['value'];
    }
    return $s;
}

function next_number(): string
{
    $prefix = 'DN' . date('ymd');
    $last = val('SELECT number FROM services WHERE number LIKE ? ORDER BY number DESC LIMIT 1', [$prefix . '%']);
    $seq = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;
    return $prefix . str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
}

/** Total biaya dari item & pembayaran */
function totals(array $items, array $payments, int $discount): array
{
    $subtotal = 0;
    foreach ($items as $i) $subtotal += $i['qty'] * $i['price'];
    $total = max(0, $subtotal - $discount);
    $paid = 0;
    foreach ($payments as $p) $paid += $p['type'] === 'REFUND' ? -$p['amount'] : $p['amount'];
    return ['subtotal' => $subtotal, 'total' => $total, 'paid' => $paid, 'remaining' => $total - $paid];
}

/** Total untuk banyak servis sekaligus (1 query item + 1 query pembayaran) */
function totals_for(array $services): array
{
    if (!$services) return [];
    $ids = implode(',', array_map(fn ($s) => (int) $s['id'], $services));
    $items = [];
    foreach (rows("SELECT service_id, qty, price FROM service_items WHERE service_id IN ($ids)") as $i) $items[$i['service_id']][] = $i;
    $pays = [];
    foreach (rows("SELECT service_id, amount, type FROM payments WHERE service_id IN ($ids)") as $p) $pays[$p['service_id']][] = $p;
    $out = [];
    foreach ($services as $s) $out[$s['id']] = totals($items[$s['id']] ?? [], $pays[$s['id']] ?? [], (int) $s['discount']);
    return $out;
}

/** Garansi berlaku sejak unit diambil */
function warranty(array $s): array
{
    if ($s['status'] !== 'DIAMBIL' || empty($s['picked_up_at'])) return ['active' => false, 'until' => null];
    $until = strtotime(date('Y-m-d', strtotime($s['picked_up_at'])) . ' 23:59:59 +' . (int) $s['warranty_days'] . ' days');
    return ['active' => $s['warranty_days'] > 0 && $until >= time(), 'until' => date('Y-m-d', $until)];
}

/** Bentuk data servis untuk JSON (tipe angka/boolean & format tanggal) */
function service_out(array $s): array
{
    foreach (['received_at', 'finished_at', 'picked_up_at', 'created_at', 'updated_at'] as $k) {
        if (array_key_exists($k, $s)) $s[$k] = iso($s[$k]);
    }
    if (array_key_exists('is_warranty_claim', $s)) $s['is_warranty_claim'] = (bool) $s['is_warranty_claim'];
    return $s;
}

function wa_message(array $s, array $customer, array $set, string $note = ''): string
{
    $tpl = $set['wa_template'] ?? 'Halo {nama}, status servis {nota}: {status}. {catatan}';
    $base = rtrim($set['public_url'] ?? '', '/');
    if ($base === '') $base = base_url();
    return trim(strtr($tpl, [
        '{nama}' => $customer['name'],
        '{nota}' => $s['number'],
        '{perangkat}' => $s['device_brand'] . ' ' . $s['device_model'],
        '{toko}' => $set['store_name'] ?? '',
        '{status}' => STATUS_LABELS[$s['status']] ?? $s['status'],
        '{catatan}' => $note,
        '{link}' => $base . '/cek?nota=' . urlencode($s['number']),
    ]));
}

function wa_link(string $phone, string $msg): string
{
    return 'https://wa.me/' . norm_phone($phone) . '?text=' . rawurlencode($msg);
}

/** Kirim otomatis via gateway Fonnte bila token diisi. Gagal = false (pakai tombol wa.me). */
function wa_send_auto(string $phone, string $msg, array $set): bool
{
    $token = trim($set['fonnte_token'] ?? '');
    if ($token === '' || !function_exists('curl_init')) return false;
    $ch = curl_init('https://api.fonnte.com/send');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query(['target' => norm_phone($phone), 'message' => $msg]),
        CURLOPT_HTTPHEADER => ['Authorization: ' . $token],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $code >= 200 && $code < 300;
}

function base_url(): string
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    return ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
}

function rp(int $n): string { return 'Rp ' . number_format($n, 0, ',', '.'); }

/** Pencarian no HP: buang non-digit & 0 di depan */
function phone_term(string $t): string { return ltrim(preg_replace('/\D/', '', $t), '0'); }
