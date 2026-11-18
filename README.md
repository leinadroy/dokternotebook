# Dokter Notebook

Aplikasi web manajemen **service center laptop / notebook** (satu cabang).

| Bagian | Teknologi | Folder |
|---|---|---|
| Frontend | SvelteKit 2 (Svelte 5) + Tailwind CSS 4, dibuild jadi SPA statis | [`frontend/`](frontend) |
| Backend (REST API) | PHP biasa 8.0+ (tanpa framework, tanpa Composer) · PDO MySQL | [`backend/`](backend) |
| Database | MySQL / MariaDB | — |

```
Browser ──► backend/index.php
              ├─ /api/*      REST API (app/api/*.php) ──► MySQL
              └─ selain itu  spa.html + /_app (hasil build SvelteKit)
Login: cookie sesi PHP (httpOnly) + token CSRF (cookie XSRF-TOKEN ↔ header X-XSRF-TOKEN), satu domain.
```

Di server **cukup PHP + MySQL** (cocok untuk shared hosting/cPanel), tidak perlu Node.js maupun Composer.

Struktur backend:

```
backend/
  index.php           pintu masuk + daftar route API
  .htaccess           rewrite ke index.php, blokir folder internal
  config.example.php  contoh konfigurasi (salin jadi config.php)
  app/bootstrap.php   koneksi DB, sesi, CSRF, helper JSON
  app/validate.php    validasi input (pesan bahasa Indonesia)
  app/domain.php      aturan bisnis: total biaya, garansi, nomor nota, WhatsApp
  app/api/*.php       endpoint per modul
  database/schema.sql struktur tabel
  database/seed.php   isi data awal (CLI)
  database/update-*.sql  pembaruan database untuk instalasi yang sudah berjalan
  logs/               error.log & file sesi (tidak bisa diakses dari web)
```

## Fitur

| Modul | Isi |
|---|---|
| **Dashboard** | Servis aktif, siap diambil, pemasukan hari ini/bulan ini, stok menipis |
| **Terima Servis** | Data pelanggan (auto-isi dari no HP pelanggan lama), unit, SN, password, keluhan, kelengkapan, kondisi fisik, teknisi, estimasi, DP |
| **Servis** | Daftar + filter/cari, detail, diagnosa, ubah status (8 status), riwayat, jasa & sparepart (stok otomatis berkurang/kembali), pembayaran DP/pelunasan/refund, diskon |
| **Cetak** | Tanda terima (dengan QR cek status) & invoice, siap print A4 |
| **Pelanggan** | Daftar, riwayat servis, total belanja, edit data |
| **Sparepart & Stok** | Master sparepart, harga beli/jual, stok minimum, barang masuk/keluar/stok opname, riwayat mutasi |
| **Garansi** | Cek masa garansi (berlaku sejak unit diambil), buat klaim garansi yang terhubung ke nota asal |
| **Laporan** | Pemasukan harian, per metode bayar, pendapatan jasa, laba kotor sparepart, kinerja teknisi, sparepart terlaris, piutang |
| **WhatsApp** | Tombol WA dengan pesan status otomatis terisi (wa.me, gratis). Opsional kirim otomatis via gateway **Fonnte** (isi token di Pengaturan) |
| **Booking Online** | Halaman publik `/booking` (landing page + form): pelanggan pilih jenis kerusakan, datang/jemput, tanggal & jam; dapat kode booking & cek status di `/booking/cek`. Staf mengelola di menu Booking Online (konfirmasi + pesan WA, ubah jadwal, batal, "Terima unit" → nota servis otomatis terisi). Bisa disematkan di situs lain lewat `/booking?embed=1` |
| **Cek Status Online** | `/cek`: pelanggan cek progres pakai nomor nota + 4 digit terakhir no HP |
| **Pengguna & Hak Akses** | Pemilik / Admin-Kasir / Teknisi (dicek di backend) |

## Kebutuhan

- PHP 8.0+ dengan ekstensi `pdo_mysql`
- MySQL 5.7+ / MariaDB 10.4+ (mis. dari XAMPP)
- Node.js 20+ (hanya di komputer development, untuk build frontend)

## Menjalankan (development)

**1. Database** — buat database kosong:

```sql
CREATE DATABASE dokternotebook CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**2. Backend** (http://127.0.0.1:8000):

```bash
cd backend
cp config.example.php config.php   # isi data database
php database/seed.php --demo       # buat tabel + data contoh (tanpa --demo: hanya akun & pengaturan)
php -S 127.0.0.1:8000 index.php
```

Cek pemasangan: http://127.0.0.1:8000/api/health

**3. Frontend** (http://localhost:5300), di terminal lain. Vite meneruskan `/api` dan `/sanctum` ke backend PHP di port 8000:

```bash
cd frontend
npm install
npm run dev
```

**Build frontend ke backend** (hasil masuk ke `backend/_app` + `backend/spa.html`, lalu aplikasi bisa dibuka langsung di http://127.0.0.1:8000):

```bash
cd frontend
npm run build
```

Akun awal (data seed, **ganti password setelah login** lewat menu "Ganti password" atau Pengguna):

| Peran | Username | Password |
|---|---|---|
| Pemilik | owner | owner123 |
| Admin/Kasir | admin | admin123 |
| Teknisi | budi / andi | teknisi123 |

Reset database ke data awal: `php database/seed.php --demo` (di folder `backend`). **Semua data dihapus.**

## Produksi (shared hosting / cPanel)

1. `npm run build` di folder `frontend`.
2. Upload isi folder `backend/` (tanpa `logs/*.log` dan `logs/sessions`) ke document root domain.
3. Buat database di cPanel, import `database/schema.sql` + data awal (atau file `database.sql` dari zip hosting) lewat phpMyAdmin.
4. Isi `config.php` (data database, `debug` = `false`).
5. Buka `/api/health` untuk memastikan semuanya OK.

Langkah lengkap untuk pengguna ada di `PANDUAN-UPLOAD.txt` di dalam zip hosting. Backup database secara rutin (phpMyAdmin > Export).

## Ringkasan API

Semua endpoint di bawah `/api`. Login memakai cookie sesi; request yang mengubah data wajib mengirim header `X-XSRF-TOKEN` (dari cookie `XSRF-TOKEN`).

| Akses | Endpoint |
|---|---|
| Publik | `GET /health`, `GET /sanctum/csrf-cookie` (di luar /api), `POST /login`, `GET /public/booking-info`, `POST /public/booking` (tanpa CSRF, dibatasi 5/jam per IP), `GET /public/booking?kode=&hp=`, `GET /public/settings`, `GET /public/cek?nota=&hp=` |
| Semua staf | `GET /me`, `POST /logout`, `POST /me/password`, `GET /dashboard`, `GET /technicians`, `GET /services`, `GET/PUT /services/{id}`, `POST /services/{id}/status`, `POST /services/{id}/items`, `DELETE /items/{id}`, `GET /customers`, `GET /customers/lookup`, `GET /customers/{id}`, `GET /spareparts`, `GET /stock-movements` |
| Pemilik & Admin | `POST /services`, `POST /services/{id}/payments`, `PUT /customers/{id}`, `POST/PUT /spareparts`, `POST /spareparts/{id}/stock`, `GET /warranty`, `GET /reports`, `GET /bookings`, `GET/PUT /bookings/{id}` |
| Pemilik | `DELETE /payments/{id}`, `DELETE /spareparts/{id}`, `GET/POST/PUT /users`, `GET/PUT /settings` |
