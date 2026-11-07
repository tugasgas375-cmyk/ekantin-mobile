# E-Kantin Mobile

Aplikasi pemesanan kantin berbasis PWA, dengan REST API Laravel dan dua antarmuka React: customer dan staf (admin/kasir).

## Prasyarat

- PHP 8.2+ dengan ekstensi PDO MySQL, OpenSSL, Mbstring, XML, Ctype, JSON, Fileinfo, GD, dan Zip
- Composer 2
- MySQL/MariaDB (misalnya XAMPP)
- Node.js 20+ dan npm

## Setup lokal (Windows/XAMPP)

1. Nyalakan MySQL di XAMPP dan buat database kosong bernama `ekantin_mobile` (collation `utf8mb4_unicode_ci`).
2. Siapkan backend:

   ```powershell
   cd backend
   composer install
   Copy-Item .env.example .env
   php artisan key:generate
   php artisan migrate --seed
   php artisan storage:link
   php artisan serve --host=0.0.0.0 --port=8001
   ```

   Jika `composer` atau `php` tidak ditemukan, tambahkan PHP dan Composer ke PATH atau jalankan executable dari instalasi XAMPP.

3. Jalankan aplikasi customer di terminal baru:

   ```powershell
   cd frontend
   npm ci
   npm run dev -- --host 0.0.0.0
   ```

   Buka `http://localhost:5173`.

4. Jalankan aplikasi staf di terminal lain:

   ```powershell
   cd frontend-staff
   npm ci
   npm run dev -- --host 0.0.0.0
   ```

   Buka `http://localhost:5174/login`.

Seeder membuat akun demo berikut; ubah password setelah masuk dan jangan gunakan kredensial demo di server publik:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ekantin.com` | `admin123` |
| Kasir | `kasir@ekantin.com` | `kasir123` |

## Konfigurasi

Salin `backend/.env.example` ke `backend/.env`, lalu sesuaikan koneksi MySQL (`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`). `FRONTEND_URL` harus cocok dengan origin frontend customer. Jika aplikasi staf berjalan di origin berbeda, tambahkan origin tersebut ke `backend/config/cors.php`.

Frontend memakai `http://127.0.0.1:8001/api` secara default. Untuk mengakses lewat HP, buat file `.env` di masing-masing folder frontend dengan alamat IP komputer yang dapat dijangkau HP, misalnya:

```dotenv
VITE_API_URL=http://192.168.1.10:8001/api
VITE_STORAGE_URL=http://192.168.1.10:8001/storage
```

Ganti alamat contoh dengan IP komputer di jaringan lokal. Pastikan firewall mengizinkan port 8001, 5173, dan 5174. Untuk production, gunakan HTTPS, konfigurasi domain/API dan CORS secara eksplisit, serta ganti akun demo.

`RICE_PRICE` dan `MIN_BARGAIN_PRICE` mengatur harga nasi tambahan dan harga minimum tawar. QRIS di aplikasi ini masih simulasi dan belum mengonfirmasi pembayaran dari penyedia pembayaran sungguhan.

## Build dan pemeriksaan

```bash
cd backend
php artisan test
```

Build frontend customer dan staf secara terpisah:

```bash
cd frontend
npm ci
npm run build

cd ../frontend-staff
npm ci
npm run build
```

## Fitur

- Customer tanpa login: melihat menu, keranjang, checkout, cek status, antrean, riwayat lokal, dan struk.
- Staf: login Sanctum, POS kasir, pengelolaan menu/kategori/pengguna, laporan serta ekspor.
- API: Laravel 12, role admin/kasir, dan database MySQL/MariaDB.

Data customer dan staf disimpan pada backend aplikasi ini; riwayat pribadi customer tersimpan di perangkatnya. Jangan menjalankan `migrate:fresh` pada database yang berisi data penting karena perintah tersebut menghapus semua tabel.
