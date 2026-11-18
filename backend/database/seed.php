<?php
/**
 * Membuat ulang database + data awal (untuk development / membuat file SQL).
 *   php database/seed.php          -> struktur + akun & pengaturan
 *   php database/seed.php --demo   -> + data contoh (sparepart, pelanggan, servis)
 * PERINGATAN: semua tabel aplikasi dihapus lalu dibuat ulang.
 */
if (PHP_SAPI !== 'cli') exit;
define('DN_ROOT', dirname(__DIR__));
require DN_ROOT . '/app/bootstrap.php';
require DN_ROOT . '/app/domain.php';
date_default_timezone_set(config('timezone') ?: 'Asia/Jakarta');

$demo = in_array('--demo', $argv, true);
$sql = file_get_contents(__DIR__ . '/schema.sql');
foreach (array_filter(array_map('trim', explode(";\n", $sql))) as $stmt) db()->exec($stmt);

$now = now();
// Akun default — SEGERA ganti password setelah login pertama.
foreach ([
    ['Pemilik', 'owner', 'owner123', 'OWNER'],
    ['Admin Kasir', 'admin', 'admin123', 'ADMIN'],
    ['Budi Teknisi', 'budi', 'teknisi123', 'TEKNISI'],
    ['Andi Teknisi', 'andi', 'teknisi123', 'TEKNISI'],
] as [$name, $username, $pw, $role]) {
    insert('users', ['name' => $name, 'username' => $username, 'password' => password_hash($pw, PASSWORD_BCRYPT), 'role' => $role, 'active' => 1, 'created_at' => $now, 'updated_at' => $now]);
}

foreach ([
    'store_name' => 'Dokter Notebook',
    'store_tagline' => 'Service Center Laptop & Notebook',
    'store_address' => 'Jl. Contoh No. 123, Kota Anda',
    'store_phone' => '0812-0000-0000',
    'default_warranty_days' => '30',
    'receipt_footer' => 'Barang yang tidak diambil lebih dari 3 bulan setelah pemberitahuan selesai di luar tanggung jawab kami. Garansi tidak berlaku jika segel rusak / terkena cairan / jatuh.',
    'wa_template' => "Halo {nama}, update servis {nota} ({perangkat}) di {toko}: status sekarang *{status}*. {catatan}\nCek status: {link}",
    'public_url' => '',
    'fonnte_token' => '',
] as $k => $v) {
    insert('settings', ['key' => $k, 'value' => $v]);
}

if ($demo) {
    foreach ([
        ['RAM-D4-8', 'RAM DDR4 8GB SODIMM', 'RAM', 220000, 350000, 6],
        ['RAM-D4-16', 'RAM DDR4 16GB SODIMM', 'RAM', 420000, 600000, 3],
        ['SSD-256', 'SSD SATA 256GB', 'Storage', 250000, 400000, 5],
        ['SSD-512-NV', 'SSD NVMe 512GB', 'Storage', 450000, 700000, 4],
        ['LCD-14-HD', 'LCD 14" HD 30pin', 'LCD', 550000, 850000, 2],
        ['LCD-156-FHD', 'LCD 15.6" FHD IPS 30pin', 'LCD', 750000, 1150000, 1],
        ['KB-ASUS-X441', 'Keyboard ASUS X441', 'Keyboard', 90000, 175000, 3],
        ['KB-LEN-IP320', 'Keyboard Lenovo IdeaPad 320', 'Keyboard', 95000, 185000, 0],
        ['BAT-ACER-AS16', 'Baterai Acer AS16A5K', 'Baterai', 280000, 450000, 2],
        ['CHG-UNI-65W', 'Charger Universal 65W', 'Charger', 85000, 150000, 8],
        ['PASTA-MX4', 'Thermal Paste MX-4', 'Aksesoris', 15000, 50000, 20],
        ['FAN-HP-14', 'Fan HP 14-bs', 'Fan', 70000, 140000, 1],
    ] as [$sku, $name, $cat, $buy, $sell, $stock]) {
        insert('spareparts', ['sku' => $sku, 'name' => $name, 'category' => $cat, 'buy_price' => $buy, 'sell_price' => $sell, 'stock' => $stock, 'min_stock' => 2, 'created_at' => $now, 'updated_at' => $now]);
    }

    $c1 = insert('customers', ['name' => 'Rina Wulandari', 'phone' => '6281234567890', 'address' => 'Jl. Melati 5', 'created_at' => $now, 'updated_at' => $now]);
    $c2 = insert('customers', ['name' => 'Agus Santoso', 'phone' => '6285711112222', 'address' => 'Perum Griya Asri B2', 'created_at' => $now, 'updated_at' => $now]);
    $s1 = insert('services', [
        'number' => next_number(), 'customer_id' => $c1, 'device_brand' => 'ASUS', 'device_model' => 'VivoBook X441',
        'serial_number' => 'K8N0CV123456', 'complaint' => 'Laptop mati total, tidak ada indikator', 'accessories' => 'Charger',
        'physical_condition' => 'Lecet di cover atas', 'status' => 'DIAGNOSA', 'technician_id' => 3, 'created_by' => 2,
        'estimated_cost' => 450000, 'received_at' => $now, 'created_at' => $now, 'updated_at' => $now,
    ]);
    insert('service_logs', ['service_id' => $s1, 'status' => 'DITERIMA', 'note' => 'Unit diterima', 'user_id' => 2, 'created_at' => $now]);
    insert('service_logs', ['service_id' => $s1, 'status' => 'DIAGNOSA', 'note' => 'Mulai pengecekan', 'user_id' => 3, 'created_at' => $now]);
    insert('payments', ['service_id' => $s1, 'amount' => 100000, 'type' => 'DP', 'method' => 'TUNAI', 'user_id' => 2, 'created_at' => $now]);
    $s2 = insert('services', [
        'number' => next_number(), 'customer_id' => $c2, 'device_brand' => 'Lenovo', 'device_model' => 'IdeaPad 320',
        'complaint' => 'Keyboard beberapa tombol tidak berfungsi', 'accessories' => 'Tanpa charger', 'created_by' => 2,
        'received_at' => $now, 'created_at' => $now, 'updated_at' => $now,
    ]);
    insert('service_logs', ['service_id' => $s2, 'status' => 'DITERIMA', 'note' => 'Unit diterima', 'user_id' => 2, 'created_at' => $now]);
}

echo 'Database siap' . ($demo ? ' (dengan data contoh)' : '') . ".\n";
