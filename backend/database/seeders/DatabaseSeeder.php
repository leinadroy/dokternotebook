<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Service;
use App\Models\Setting;
use App\Models\Sparepart;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Akun default — SEGERA ganti password setelah login pertama.
        $users = [
            ['Pemilik', 'owner', 'owner123', 'OWNER'],
            ['Admin Kasir', 'admin', 'admin123', 'ADMIN'],
            ['Budi Teknisi', 'budi', 'teknisi123', 'TEKNISI'],
            ['Andi Teknisi', 'andi', 'teknisi123', 'TEKNISI'],
        ];
        foreach ($users as [$name, $username, $password, $role]) {
            User::firstOrCreate(['username' => $username], compact('name', 'password', 'role'));
        }

        $settings = [
            'store_name' => 'Dokter Notebook',
            'store_tagline' => 'Service Center Laptop & Notebook',
            'store_address' => 'Jl. Contoh No. 123, Kota Anda',
            'store_phone' => '0812-0000-0000',
            'default_warranty_days' => '30',
            'receipt_footer' => 'Barang yang tidak diambil lebih dari 3 bulan setelah pemberitahuan selesai di luar tanggung jawab kami. Garansi tidak berlaku jika segel rusak / terkena cairan / jatuh.',
            'wa_template' => "Halo {nama}, update servis {nota} ({perangkat}) di {toko}: status sekarang *{status}*. {catatan}\nCek status: {link}",
            'public_url' => '',
            'fonnte_token' => '',
        ];
        foreach ($settings as $key => $value) {
            Setting::firstOrCreate(['key' => $key], ['value' => $value]);
        }

        $parts = [
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
        ];
        foreach ($parts as [$sku, $name, $category, $buy, $sell, $stock]) {
            Sparepart::firstOrCreate(['sku' => $sku], [
                'name' => $name, 'category' => $category, 'buy_price' => $buy,
                'sell_price' => $sell, 'stock' => $stock, 'min_stock' => 2,
            ]);
        }

        if (Service::count() === 0) {
            $budi = User::where('username', 'budi')->first();
            $admin = User::where('username', 'admin')->first();
            $c1 = Customer::create(['name' => 'Rina Wulandari', 'phone' => '6281234567890', 'address' => 'Jl. Melati 5']);
            $c2 = Customer::create(['name' => 'Agus Santoso', 'phone' => '6285711112222', 'address' => 'Perum Griya Asri B2']);

            $s1 = Service::create([
                'number' => Service::nextNumber(), 'customer_id' => $c1->id, 'device_brand' => 'ASUS',
                'device_model' => 'VivoBook X441', 'serial_number' => 'K8N0CV123456',
                'complaint' => 'Laptop mati total, tidak ada indikator', 'accessories' => 'Charger',
                'physical_condition' => 'Lecet di cover atas', 'status' => 'DIAGNOSA',
                'technician_id' => $budi->id, 'created_by' => $admin->id, 'estimated_cost' => 450000,
            ]);
            $s1->logs()->create(['status' => 'DITERIMA', 'note' => 'Unit diterima', 'user_id' => $admin->id]);
            $s1->logs()->create(['status' => 'DIAGNOSA', 'note' => 'Mulai pengecekan', 'user_id' => $budi->id]);
            $s1->payments()->create(['amount' => 100000, 'type' => 'DP', 'method' => 'TUNAI', 'user_id' => $admin->id]);

            $s2 = Service::create([
                'number' => Service::nextNumber(), 'customer_id' => $c2->id, 'device_brand' => 'Lenovo',
                'device_model' => 'IdeaPad 320', 'complaint' => 'Keyboard beberapa tombol tidak berfungsi',
                'accessories' => 'Tanpa charger', 'created_by' => $admin->id,
            ]);
            $s2->logs()->create(['status' => 'DITERIMA', 'note' => 'Unit diterima', 'user_id' => $admin->id]);
        }
    }
}
