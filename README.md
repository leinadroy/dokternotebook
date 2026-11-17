# Dokter Notebook

Aplikasi web manajemen **service center laptop / notebook** (satu cabang).

**Teknologi:** Next.js 15 (App Router + Server Actions) · React 19 · Prisma 6 · SQLite · Tailwind CSS 4

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
| **Pengguna & Hak Akses** | Pemilik / Admin-Kasir / Teknisi |

## Menjalankan

```bash
npm install
npm run setup      # buat database + data awal
npm run dev        # buka http://localhost:3100
```

Akun awal (data seed, **ganti password setelah login**, lewat menu "Ganti password" atau Pengguna):

| Peran | Username | Password |
|---|---|---|
| Pemilik | owner | owner123 |
| Admin/Kasir | admin | admin123 |
| Teknisi | budi / andi | teknisi123 |

## Produksi

1. Ganti `SESSION_SECRET` di `.env` dengan string acak panjang.
2. `npm run build` lalu `npm start`.
3. Di **Pengaturan**, isi nama/alamat toko dan **Alamat web aplikasi** (dipakai untuk link & QR cek status).
4. Backup rutin file database `prisma/dokternotebook.db`.

> Jika diakses via HTTP biasa (tanpa HTTPS) di jaringan lokal saat mode produksi, set `INSECURE_COOKIE=1` di `.env` agar login bisa menyimpan cookie.

Reset database ke data awal: hapus `prisma/dokternotebook.db`, lalu jalankan `npm run setup`.
