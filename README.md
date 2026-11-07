# E-Kantin Mobile (PWA)

Versi mobile dari E-Kantin — aplikasi web PWA yang bisa di-install di HP (Android/iOS), terpisah dari versi web.

> ⚠️ **Ini project terpisah** dari versi web (`kantin/ekantin`): database, backend, dan frontend sendiri. Data tidak terhubung dengan versi web.

## Struktur

```
ekantin-mobile/
├── backend/    Laravel 12 REST API + Sanctum  → port 8001, DB: ekantin_mobile
└── frontend/   React + Vite + Tailwind + PWA  → port 5173
```

## Prasyarat

- PHP 8.2 (XAMPP)
- MySQL/MariaDB (XAMPP) — harus menyala
- Node.js 20+ & npm
- Composer (`php C:\xampp\htdocs\composer.phar ...` jika tidak di PATH)

## Cara Menjalankan

### 1. Backend

```bash
cd backend

# database (buat dulu: CREATE DATABASE ekantin_mobile)
php artisan migrate --seed

# jalankan server di port 8001
php artisan serve --host=127.0.0.1 --port=8001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

Untuk production build (PWA): `npm run build` → folder `dist/` (bisa di-deploy ke web server mana pun).

### 3. Buka di HP

- Pastikan HP dan komputer satu jaringan Wi-Fi.
- Buka `http://<IP-KOMPUTER>:5173` di browser HP.
- Menu **⋮ → Tambahkan ke Layar Utama** (Add to Home Screen) → jadi aplikasi.

## Akun Demo (Staf)

| Role  | Email             | Password  |
|-------|-------------------|-----------|
| Admin | admin@ekantin.com | admin123  |
| Kasir | kasir@ekantin.com | kasir123  |

Customer tidak perlu login (tamu), riwayat disimpan di localStorage HP.

## Halaman

**Customer (tamu):**
- `/` — browse menu, cari, kategori, keranjang, checkout (tunai/QRIS), nawar min Rp 5.000, +nasi, suhu dingin/panas
- `/track/:id` — lacak pesanan live (poll 5 detik, notifikasi suara, bisa batal selagi pending)
- `/riwayat` — riwayat pesanan hari ini (tersimpan di perangkat)
- `/struk/:queue` — struk (cetak / unduh PNG)
- `/bayar/:id` — pembayaran QRIS (simulasi)
- `/cek-status` — cek status via nomor antrean
- `/antrian` — layar antrian besar untuk TV/monitor kantin

**Staf (`/login`):**
- **Kasir** `/kasir` — POS: pilih menu, cart, checkout, proses/selesai/batalkan pesanan, notifikasi bayar QRIS (poll 3 detik)
- **Admin** `/admin` — dashboard statistik, CRUD kategori/menu/user, laporan harian/bulanan + export PDF & Excel, menu favorit/best seller

## API Utama

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET | `/api/categories`, `/api/menu-items` | publik |
| POST | `/api/orders` | checkout customer (throttle 10/menit) |
| GET | `/api/orders/{id}/status` | lacak pesanan |
| GET | `/api/queue-status/{no}`, `/api/receipt/{no}` | cek status & struk |
| POST | `/api/payment/{id}/qris-confirm` | simulasi bayar QRIS |
| POST | `/api/login` | token staf (Sanctum) |
| * | `/api/admin/*` | CRUD + laporan + export (role:admin) |
| * | `/api/kasir/*` | POS + poll (role:kasir) |

## Tests

```bash
cd backend
php artisan test    # 18 tests — auth, checkout, nawar, nasi, QRIS, POS, admin
```

## Konfigurasi

`backend/.env`:

- `DB_DATABASE=ekantin_mobile` — nama database
- `FRONTEND_URL=http://localhost:5173` — origin yang diizinkan CORS
- `RICE_PRICE=2000` — harga tambahan nasi

`frontend/` (opsional, via env):

- `VITE_API_URL` — default `http://127.0.0.1:8001/api`
- `VITE_STORAGE_URL` — default `http://127.0.0.1:8001/storage`

> Jika diakses dari HP, ganti `VITE_API_URL` ke `http://<IP-KOMPUTER>:8001/api` lalu build ulang.

## Catatan

- **QRIS simulasi** — tidak terhubung payment gateway sungguhan (sama seperti versi web).
- **Data terpisah** — menu/akun di versi mobile diisi lewat seeder & halaman admin sendiri.
- Reset data: `php artisan migrate:fresh --seed`
