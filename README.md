# FTEMation

AI-Powered Workload & Automation Intelligence. Laravel 13 REST API di root dan React + TypeScript di `frontend/`, dengan CSS biasa.

Fase 1 sudah mencakup foundation, autentikasi session/CSRF, import Excel, FTE, dan dashboard workload dasar. Integrasi DeepSeek, grouping hasil AI, insight, dan export adalah pekerjaan fase berikutnya. Aplikasi tidak menyajikan penilaian AI atau saving yang dibuat-buat.

## Mulai membaca kode

Baca [panduan developer](docs/DEVELOPMENT.md) untuk struktur folder, alur request, lokasi mengubah fitur, dan catatan pembersihan. Pekerjaan lanjutan tersedia di [roadmap](docs/ROADMAP.md); aturan kontribusi ada di [AGENTS.md](AGENTS.md).

Palet warna, struktur CSS, dan cara mengulang pemeriksaan desktop/mobile tersedia di [panduan tampilan UI](docs/UI_DESIGN.md).

| Ingin memahami/mengubah | Mulai dari |
|---|---|
| Halaman React | `frontend/src/pages/` |
| Header, sidebar, dan kerangka workspace | `frontend/src/layouts/` |
| Menu dan judul halaman | `frontend/src/app/navigation.ts` |
| State sesi dan pemilihan dataset | `frontend/src/hooks/` |
| Client Axios dan format tampilan | `frontend/src/lib/` |
| API Laravel dan validasi request | `routes/`, `app/Http/` |
| Import, validasi workbook, FTE, dan agregasi | `app/Services/Workload/` |
| Schema, data awal, dan pengujian | `database/`, `tests/` |

## Menjalankan hasil implementasi lokal

Database `ftemation`, `.env`, migration, akun demo, dan dataset referensi sudah disiapkan pada workspace ini. Nyalakan MySQL pada XAMPP, lalu dari root:

```powershell
php artisan ftemation:check-database
composer dev
```

Buka **http://localhost:8000/**. Build React disajikan Laravel pada origin yang sama.

Akun demo lokal:

- Email: `demo@ftemation.local`
- Password: `FTE-Demo-2026!`

Nilai akun berasal dari `DEMO_EMAIL` dan `DEMO_PASSWORD` di `.env`. Seeder tidak mengganti password akun yang sudah ada. Spesifikasi berada di `docs/`, studi kasus di `references/`, dan workbook di `samples/`; salinan starter kit sudah dibersihkan.

## Instalasi pada mesin baru

Prasyarat: PHP 8.4, Composer, Node.js (saat pengujian: 24.15.0), npm, serta database MySQL/MariaDB **yang sudah tersedia** bernama `ftemation`. Ekstensi PHP: pdo_mysql, pdo_sqlite untuk tes, mbstring, fileinfo, xml, dom, simplexml, xmlreader, xmlwriter, zip, gd, iconv, curl, openssl, dan bcmath. Gunakan `php -v`, `php --ini`, dan `where.exe php` untuk memastikan CLI memakai PHP yang sesuai. PHP bawaan Apache XAMPP dapat berbeda dari PHP CLI.

```powershell
composer install
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
```

Edit `.env`: isi koneksi untuk **database `ftemation` yang sudah ada**, password MySQL jika diperlukan, dan `DEMO_PASSWORD` minimal 12 karakter. `.env.example` tidak memuat rahasia. Konfigurasi lokal default memakai `DB_CONNECTION=mysql`, host `127.0.0.1`, port `3306`, user `root`, dan `utf8mb4_unicode_ci`.

```powershell
php artisan key:generate
php artisan ftemation:check-database
# Lanjutkan hanya jika pemeriksaan koneksi di atas berhasil ke ftemation.
php artisan migrate
php artisan db:seed
npm --prefix frontend ci
npm --prefix frontend run build
composer dev
```

Perintah tidak membuat database. Jangan menggunakan `migrate:fresh`, `db:wipe`, atau database proyek lain untuk setup. `composer dev` menjalankan PHP CLI dengan batas upload 6 MB/post 8 MB; batas aplikasi tetap 5 MB. Tidak diperlukan Apache untuk menjalankan server development ini.

Untuk development frontend, jalankan terminal kedua:

```powershell
npm --prefix frontend run dev
```

Buka **http://localhost:5173/**. Vite mem-proxy `/api` dan `/sanctum` ke Laravel pada `localhost:8000`. Gunakan hostname `localhost` secara konsisten di browser. `127.0.0.1` pada koneksi database tidak memengaruhi cookie browser. Tidak diperlukan CORS lintas origin karena frontend memakai proxy atau build satu origin.

Sesudah perubahan frontend, ulangi `npm --prefix frontend run build` untuk memperbarui tampilan pada port 8000. Hentikan masing-masing server menggunakan Ctrl+C. Build berada di `public/build/` dan tidak di-commit; sumbernya ada di `frontend/`.

## Import dan validasi

1. Login, lalu buka **Import dataset**.
2. Pilih `samples/FTEMation_Workload_Dataset_v1.xlsx`.
3. Klik **Validasi & import**. Dashboard menampilkan total dan perbandingan FTE departemen; Data aktivitas menyediakan pencarian, filter, pagination, deskripsi, dan rincian kalkulasi.
4. Import yang sama boleh dilakukan lagi sebagai riwayat dataset baru. Dashboard memakai satu dataset yang dipilih, sehingga tidak menjumlahkan berbagai versi import.

Workbook harus `.xlsx` asli, maksimal 5 MB, tepat satu sheet `Workload`, dengan header pada baris 1 dalam urutan:

```text
activity_id, employee_id, employee_name, department, activity_name, description, frequency, volume, duration_minutes
```

Seluruh kolom wajib. ID berupa teks nonkosong (huruf/angka, titik, garis bawah, atau tanda hubung); activity_id unik tanpa membedakan huruf besar/kecil dalam satu import. Nama/departemen karyawan harus konsisten. Frekuensi dinormalisasi ke daily/weekly/monthly; spasi nama/departemen dirapikan dan variasi kapitalisasi departemen disatukan. Angka harus positif, maksimal 6 desimal dan 999.999.999 per nilai. Formula Excel ditolak dan tidak dihitung. Baris kosong dilewati tanpa mengubah nomor baris error. Batas teknis: 10.000 aktivitas dan 50 MB isi arsip setelah dekompresi.

Workbook kecil yang valid diterima dengan peringatan bila kurang dari 50 aktivitas, 10 karyawan, atau 3 departemen. Workbook evaluasi AI tidak dapat diimpor sebagai workload.

File asli disimpan dengan nama acak pada `storage/app/private/imports`, tanpa tautan publik. Import berhasil menyimpan employees, activities, dan status imported dalam satu transaksi. Error menyisakan satu catatan import berstatus failed untuk audit beserta file privat dan pesan validasi; tidak menyisakan employees/activities parsial. Error per baris terlihat langsung dan dapat dibuka kembali melalui riwayat import.

## Perhitungan dan batas interpretasi

```text
annual_minutes = volume × duration_minutes × annual_factor
FTE = annual_minutes / 115200
annual_factor: daily=240, weekly=48, monthly=12
estimated_saving = FTE × saving_rate
saving_rate: high=60%, medium=30%, low=10%
priority = 100 × (saving / maxSavingRun) × riskFactor × effortFactor
```

Risk low/medium/high: 1/0,7/0,4. Effort low/medium/high: 1/0,75/0,5. Jika maxSavingRun=0, skor prioritas=0. Parameter ada di `config/ftemation.php`. Kalkulator saving dan prioritas sudah diuji, tetapi belum dipakai untuk menampilkan hasil AI pada Fase 1.

Laravel menghitung dan menyimpan FTE dengan 12 desimal. Ringkasan dihitung dari input tersimpan sebelum pembulatan tampilan, bukan penjumlahan FTE empat desimal dari UI. Dataset referensi diperiksa melalui tes, bukan nilai hasil yang di-hardcode:

- ACT-0001: 10 × 9 × 240 / 115200 = **0.1875 FTE**.
- Total 60 aktivitas: **4.4671875 FTE**.
- 12 karyawan dan 3 departemen, masing-masing 5 aktivitas/karyawan dan 20 aktivitas/departemen.

Aktivitas tercatat hanya cuplikan pekerjaan. Saving adalah estimasi kapasitas waktu, bukan keputusan pengurangan headcount. Keputusan berisiko tinggi tetap memerlukan manusia.

## API dan arsitektur

- `GET /sanctum/csrf-cookie`: inisialisasi CSRF.
- `POST /api/login`: email/password, session cookie; dibatasi 5 percobaan/menit per kombinasi email/IP.
- `GET /api/user`, `POST /api/logout`: identitas dan invalidasi sesi.
- `GET /api/imports`, `POST /api/imports`: riwayat dan multipart `file`.
- `GET /api/imports/{id}`: ringkasan serta error import.
- `GET /api/imports/{id}/activities`: `search`, `department`, `frequency`, `page`, `per_page` (maksimal 100).

Selain login/CSRF, endpoint memerlukan Sanctum session. Import/detail/aktivitas dibatasi ke pemilik import. Upload dibatasi 30/menit. Axios menggunakan credentials dan XSRF cookie; tidak ada bearer token atau kredensial pada localStorage. Login mengganti ID sesi dan logout menginvalidasi sesi.

Controller hanya mengatur request/response. Form Request menangani input API, `WorkloadWorkbookReader` memvalidasi workbook, `WorkloadImportService` menyimpan secara transaksional, `FteCalculator` memiliki rumus domain, dan `WorkloadSummaryService` mengagregasi satu import.

Tujuh tabel domain sesuai ERD: users, imports, employees, activities, analysis_runs, activity_groups, activity_analyses. Tabel terakhir menyiapkan kolom nullable untuk analisis pending/failed. Metadata audit tambahan: validation_errors/warnings pada imports dan error_message pada analysis_runs. Tabel infrastruktur Laravel menyediakan session, cache, queue, dan password reset. Taksonomi 20 kategori di-seed dari salinan definisi `GroupTaxonomy`; label evaluasi tidak dimasukkan sebagai hasil atau input klasifikasi.

## Pengujian

```powershell
composer test
php vendor/bin/pint --test
npm --prefix frontend run build
npm --prefix frontend run lint
composer validate --no-check-publish
composer check-platform-reqs
node scripts/smoke-http.mjs
```

PHPUnit memakai SQLite in-memory melalui override paksa pada `phpunit.xml`, bukan database ftemation. Smoke HTTP memakai server lokal dan akun demo pada `.env`, memeriksa cookie/CSRF aktif, login/logout, akses privat, dan acceptance dataset yang sudah ada. Skrip tidak mencetak password/cookie.

Untuk menguji upload nyata (menambahkan **satu import baru** ke database lokal):

```powershell
node scripts/smoke-http.mjs --import
```

Untuk menguji proxy Vite:

```powershell
$env:SMOKE_BASE_URL='http://localhost:5173'
$env:SMOKE_ORIGIN='http://localhost:5173'
node scripts/smoke-http.mjs
Remove-Item Env:\SMOKE_BASE_URL
Remove-Item Env:\SMOKE_ORIGIN
```

Hasil pengujian, keterbatasan, dan inventaris file: [docs/PHASE_1_REPORT.md](docs/PHASE_1_REPORT.md).

## Troubleshooting dan fase berikutnya

- Koneksi gagal: nyalakan MySQL XAMPP dan cocokkan host/port/user/password di `.env`; jalankan `php artisan config:clear` setelah mengubah konfigurasi.
- 419: muat ulang, gunakan localhost di semua URL frontend, dan pastikan `/sanctum/csrf-cookie` berhasil. Jangan mematikan middleware CSRF.
- 413/upload kosong: jalankan `composer dev`; untuk Apache, sesuaikan PHP yang dipakai Apache agar upload_max_filesize minimal 6M dan post_max_size minimal 8M, lalu restart Apache.
- Build belum tersedia (503): jalankan npm ci dan build di frontend.
- Kegagalan storage/database: periksa izin `storage/` dan `bootstrap/cache/`, koneksi database, serta `storage/logs/laravel.log`.

Lingkungan yang diuji menyediakan MariaDB 10.4.32 melalui koneksi Laravel mysql. MySQL 8 sesuai keputusan teknis belum diuji pada server terpisah. PHP 8.4 CLI saat ini berasal dari runtime proyek lain yang sudah tersedia; implementasi tidak mengubah runtime tersebut.

Fase berikutnya: validasi akses riil ke DeepSeek `deepseek-flash` non-thinking, prompt/rubrik versioned dalam file, JSON validation dan oversight, database queue/retry/cache, lalu grouping dan kesimpulan per karyawan/departemen, dashboard hasil serta prioritas, dan export DomPDF/Excel/results.json. Konfigurasi DeepSeek sudah disiapkan di `.env.example`, tetapi belum ada request AI atau hasil inference. Export final harus menunggu run lengkap dengan seluruh aktivitas success dan summary lengkap. What-If dan Flutter tetap ditunda.
