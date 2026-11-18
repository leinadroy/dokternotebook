<?php
/**
 * Validasi input sederhana. Contoh aturan:
 *   'name' => 'required|string|max:255'
 *   'qty'  => 'nullable|int|min:1'
 *   'type' => 'required|in:JASA,PART'
 *   'technician_id' => 'nullable|int|exists:users'
 * Field yang tidak dikirim tidak ikut hasil, kecuali 'required'.
 * Gagal -> HttpError 422 dengan pesan berbahasa Indonesia.
 */
defined('DN_ROOT') or exit;

const FIELD_LABELS = [
    'phone' => 'No. HP', 'customer_name' => 'Nama pelanggan', 'name' => 'Nama', 'device_brand' => 'Merk',
    'device_model' => 'Tipe / model', 'complaint' => 'Keluhan', 'username' => 'Username', 'password' => 'Password',
    'amount' => 'Nominal', 'sku' => 'Kode / SKU', 'qty' => 'Jumlah', 'price' => 'Harga', 'email' => 'Email',
    'store_name' => 'Nama toko', 'public_url' => 'Alamat web', 'description' => 'Deskripsi', 'sparepart_id' => 'Sparepart',
    'new' => 'Password baru', 'old' => 'Password lama', 'status' => 'Status', 'role' => 'Peran', 'category' => 'Kategori',
    'problem_type' => 'Jenis kerusakan', 'preferred_date' => 'Tanggal', 'preferred_time' => 'Jam', 'service_method' => 'Jenis layanan',
    'address' => 'Alamat',
];

function validate(array $input, array $rules): array
{
    $out = [];
    $errors = [];
    foreach ($rules as $field => $ruleStr) {
        $label = FIELD_LABELS[$field] ?? str_replace('_', ' ', ucfirst($field));
        $rs = explode('|', $ruleStr);
        $present = array_key_exists($field, $input);
        $v = $present ? $input[$field] : null;
        if (is_string($v)) $v = trim($v);
        $empty = $v === null || $v === '';

        if ($empty) {
            if (in_array('required', $rs, true)) {
                $errors[$field][] = "$label wajib diisi.";
            } elseif ($present) {
                $out[$field] = null;
            }
            continue;
        }

        foreach ($rs as $r) {
            [$name, $arg] = array_pad(explode(':', $r, 2), 2, null);
            switch ($name) {
                case 'string':
                    if (!is_scalar($v)) $errors[$field][] = "$label tidak valid.";
                    $v = (string) $v;
                    break;
                case 'int':
                    if (!is_numeric($v) || (int) $v != $v) $errors[$field][] = "$label harus berupa angka.";
                    $v = (int) $v;
                    break;
                case 'bool':
                    $v = filter_var($v, FILTER_VALIDATE_BOOLEAN);
                    break;
                case 'max':
                    if (is_string($v) && mb_strlen($v) > (int) $arg) $errors[$field][] = "$label maksimal $arg karakter.";
                    if (is_int($v) && $v > (int) $arg) $errors[$field][] = "$label maksimal $arg.";
                    break;
                case 'min':
                    if (is_int($v) && $v < (int) $arg) $errors[$field][] = "$label minimal $arg.";
                    if (is_string($v) && mb_strlen($v) < (int) $arg) $errors[$field][] = "$label minimal $arg karakter.";
                    break;
                case 'in':
                    if (!in_array((string) $v, explode(',', $arg), true)) $errors[$field][] = "$label tidak valid.";
                    break;
                case 'date':
                    $d = DateTime::createFromFormat('Y-m-d', substr((string) $v, 0, 10));
                    if (!$d) $errors[$field][] = "$label harus berupa tanggal.";
                    else $v = $d->format('Y-m-d');
                    break;
                case 'email':
                    if (!filter_var($v, FILTER_VALIDATE_EMAIL)) $errors[$field][] = "Format $label tidak valid.";
                    break;
                case 'url':
                    if (!filter_var($v, FILTER_VALIDATE_URL)) $errors[$field][] = "$label harus berupa alamat web lengkap, mis. https://tokoanda.com";
                    break;
                case 'exists':
                    if (!val("SELECT COUNT(*) FROM `$arg` WHERE id = ?", [(int) $v])) $errors[$field][] = "$label tidak ditemukan.";
                    break;
            }
        }
        $out[$field] = $v;
    }
    if ($errors) {
        throw new HttpError(422, reset($errors)[0], $errors);
    }
    return $out;
}
