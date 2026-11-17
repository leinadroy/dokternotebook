# Dokter Notebook

Aplikasi web manajemen **service center laptop / notebook** (satu cabang).

| Bagian | Teknologi | Folder |
|---|---|---|
| Frontend | SvelteKit 2 (Svelte 5) + Tailwind CSS 4, dibuild jadi SPA statis | [`frontend/`](frontend) |
| Backend (REST API) | PHP 8.2 · Laravel 12 · Sanctum (login sesi cookie) | [`backend/`](backend) |
| Database | MySQL / MariaDB | — |

```
Browser ──► Laravel (backend/public)
              ├─ /api/*      REST API ──► MySQL
              └─ selain itu  spa.html + /_app (hasil build SvelteKit)
Login: cookie sesi httpOnly + proteksi CSRF (Sanctum SPA auth), satu domain.
```

Di server **cukup PHP + MySQL** (cocok untuk shared hosting/cPanel), tidak perlu Node.js.

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
| **Cek Status Online** | `/cek`: pelanggan cek progres pakai nomor nota + 4 digit terakhir no HP |
| **Pengguna & Hak Akses** | Pemilik / Admin-Kasir / Teknisi (dicek di backend) |

## Kebutuhan

- PHP 8.2+ dengan ekstensi `pdo_mysql`, Composer
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
composer install
cp .env.example .env      # sesuaikan DB_USERNAME / DB_PASSWORD
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

**3. Frontend** (http://localhost:5300), di terminal lain. Vite meneruskan `/api` dan `/sanctum` ke Laravel di port 8000:

```bash
cd frontend
npm install
npm run dev
```

**Build frontend ke Laravel** (hasil masuk ke `backend/public/_app` + `spa.html`, lalu aplikasi bisa dibuka langsung di http://127.0.0.1:8000):

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

Reset database ke data awal: `php artisan migrate:fresh --seed` (di folder `backend`).

## Produksi

- **Shared hosting (cPanel):** jalankan `npm run build` di `frontend`, lalu `composer install --no-dev --optimize-autoloader` di salinan folder `backend`. Upload, import SQL lewat phpMyAdmin, dan isi `.env` (`APP_ENV=production`, `APP_DEBUG=false`, `APP_URL`, `DB_*`). Arahkan document root ke `backend/public`. Langkah lengkapnya ada di `PANDUAN-UPLOAD.txt` di dalam zip hosting.
- **VPS:** sama seperti di atas, ditambah `php artisan config:cache route:cache`.
- Di menu **Pengaturan**, isi **Alamat web aplikasi** (dipakai untuk link & QR cek status di nota dan pesan WA).
- Backup rutin database MySQL (mis. `mysqldump dokternotebook > backup.sql`).

## Ringkasan API

Semua endpoint di bawah `/api`. Login memakai cookie sesi; request yang mengubah data wajib mengirim header `X-XSRF-TOKEN` (dari cookie `XSRF-TOKEN`).

| Akses | Endpoint |
|---|---|
| Publik | `GET /sanctum/csrf-cookie`, `POST /login`, `GET /public/settings`, `GET /public/cek?nota=&hp=` |
| Semua staf | `GET /me`, `POST /logout`, `POST /me/password`, `GET /dashboard`, `GET /technicians`, `GET /services`, `GET/PUT /services/{id}`, `POST /services/{id}/status`, `POST /services/{id}/items`, `DELETE /items/{id}`, `GET /customers`, `GET /customers/lookup`, `GET /customers/{id}`, `GET /spareparts`, `GET /stock-movements` |
| Pemilik & Admin | `POST /services`, `POST /services/{id}/payments`, `PUT /customers/{id}`, `POST/PUT /spareparts`, `POST /spareparts/{id}/stock`, `GET /warranty`, `GET /reports` |
| Pemilik | `DELETE /payments/{id}`, `DELETE /spareparts/{id}`, `GET/POST/PUT /users`, `GET/PUT /settings` |
