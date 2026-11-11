# FTEMation — Hasil implementasi Fase 1

Tanggal verifikasi: 11 November 2026 (Asia/Jakarta).

Catatan ini mencatat hasil milestone awal. Peta kode dan catatan struktur terkini tersedia di [panduan developer](DEVELOPMENT.md). Perapian struktur tidak berarti fitur AI sudah diimplementasikan.

## Hasil yang tersedia

- Laravel 13.42.0/PHP 8.4, React 19/TypeScript/Vite, Axios dan React Router, CSS biasa.
- Sanctum session/cookie/CSRF; login demo, logout, endpoint privat, rate limit login, pembatasan data berdasarkan pemilik import.
- Migration tujuh tabel domain sesuai ERD, model dan relasi Eloquent, session/cache/queue database sebagai infrastruktur.
- Seeder akun demo dan tepat 20 kategori grouping dari workbook evaluasi; seeder idempotent dan tidak mengganti password akun yang sudah ada.
- REST upload Excel privat, validasi sembilan kolom, nomor baris pada error, konsistensi nama/departemen karyawan, ID duplikat, frekuensi, angka positif dan presisi, penolakan formula, batas file/baris/dekompresi, peringatan ukuran minimum assessment.
- Import employees/activities/status imported dalam transaksi; audit failed menyimpan pesan error dan file privat tanpa data workload parsial.
- FTE deterministik dengan 12 desimal tersimpan dan agregasi dari input sebelum pembulatan UI. Rumus saving dan priority siap serta diuji; belum menghasilkan output AI.
- UI login, dashboard workload, perbandingan departemen, pemilihan dataset, riwayat/error import, pencarian/filter/pagination aktivitas, dan deskripsi/rincian FTE.
- Build React disajikan Laravel pada `/app/`; development menggunakan Vite proxy.

## Database lokal dan acceptance nyata

Database yang dipakai hanya `ftemation` yang sudah disediakan pengguna. Pemeriksaan awal menunjukkan database kosong. Tidak ada CREATE DATABASE, DROP DATABASE, migrate:fresh, atau perubahan database proyek lain.

Server lokal adalah **MariaDB 10.4.32 dari XAMPP**, diakses melalui koneksi Laravel `mysql`. Seluruh 15 tabel (7 domain dan 8 infrastruktur) memakai `utf8mb4_unicode_ci`. MySQL 8 pada server terpisah belum diuji.

Empat migration tercatat Ran, batch 1. Seeder menghasilkan 1 akun demo dan 20 kategori. Upload referensi melalui HTTP menjadi import #1; keadaan setelah pengujian:

| Pemeriksaan | Hasil dari database |
|---|---:|
| Aktivitas | 60 |
| Karyawan | 12 |
| Departemen | 3 |
| ACT-0001 FTE tersimpan | 0.187500000000 |
| SUM(activities.fte) | 4.467187500000 |
| Kategori grouping | 20 |

Target acceptance hanya berada dalam tes dan dokumentasi; nilai aplikasi berasal dari volume, durasi, dan faktor frekuensi workbook.

## Pengujian yang dijalankan

| Perintah / pemeriksaan | Hasil |
|---|---|
| `php artisan ftemation:check-database` | Berhasil ke ftemation, server 10.4.32-MariaDB |
| `php artisan migrate --no-interaction` | 4 migration berhasil |
| `php artisan db:seed --no-interaction` | DemoUserSeeder dan ActivityGroupSeeder berhasil |
| `php artisan migrate:status` | Seluruh migration Ran |
| `composer test -- --no-ansi` | **36 tes lulus, 169 assertion**, durasi 3,99 detik pada run akhir backend |
| `npm --prefix frontend run build` | TypeScript dan Vite production build berhasil |
| `npm --prefix frontend run lint` | Berhasil tanpa warning |
| `php vendor/bin/pint --test --no-ansi` | Format PHP lulus |
| `composer validate --no-check-publish` | composer.json dan lock valid |
| `composer check-platform-reqs` | Seluruh kebutuhan platform paket terpenuhi |
| `node scripts/smoke-http.mjs --import` ke Laravel port 8000 | **24 pemeriksaan lulus**, termasuk upload asli ke database ftemation |
| Smoke HTTP melalui Vite port 5173 | **23 pemeriksaan lulus**, memakai dataset tersimpan dan tidak menambah import |
| Smoke HTTP Laravel setelah build/format akhir | **23 pemeriksaan lulus**, memakai dataset tersimpan |
| SQL read-only setelah tes | 60/12/3, ACT-0001 dan total FTE cocok, 20 kategori |

PHPUnit memakai SQLite in-memory dengan DB_CONNECTION/DB_DATABASE/DB_URL dipaksa pada phpunit.xml. Ia tidak melakukan reset database lokal. Smoke HTTP memakai session/database asli dan menguji CSRF yang aktif: login dan import tanpa token mengembalikan 419, kredensial salah 422, guest 401, login benar 200, import 201, logout mengakhiri akses privat.

Cakupan tes: ketiga frekuensi; input kalkulator invalid; saving/priority; login/logout/hash/rate limit/input malformed; isolasi import antar-user; workbook asli; import ulang sebagai riwayat; nol/negatif/nonnumerik/desimal berlebih; frekuensi/description invalid; formula; duplikasi case-insensitive; karyawan tidak konsisten; header/sheet salah; workbook evaluasi; workbook kosong/kecil; kolom ekstra; file korup/terlalu besar; normalisasi; rollback saat kegagalan DB disimulasikan; filter/pagination; seeder idempotent.

## Kendala yang ditemukan dan diperbaiki

- Pengaturan autoload Composer diubah ke non-optimized untuk menghindari pemindaian awal yang sangat lambat pada lingkungan Windows ini.
- composer.lock diperbarui setelah penetapan PHP ^8.4; validasi akhir berhasil.
- Input email berbentuk array kini ditolak 422 oleh Form Request, tanpa memicu error cast pada limiter.
- Skrip smoke awal untuk Vite mengirim Accept JSON pada permintaan halaman SPA dan memperoleh 404. Header halaman diubah menjadi text/html; run ulang berhasil 23 pemeriksaan. API tetap memakai Accept JSON.
- File scaffold Laravel yang memakai Tailwind dan contoh UI Vite tidak dipakai/dihapus; frontend aplikasi memakai CSS biasa.

## Batas verifikasi dan pekerjaan tersisa

Verifikasi browser Windows **belum selesai**. Browser access host tidak tersedia; fallback Computer Use dihentikan karena alat tidak dapat memastikan URL browser untuk kebijakannya. Tidak ada klaim screenshot, verifikasi visual, mobile viewport, klik tombol, atau upload melalui UI browser. Responsivitas CSS, TypeScript build, lint, serta kontrak HTTP/proxy sudah diperiksa; review visual dan interaksi browser tetap perlu dilakukan.

Fase 1 tidak menyelesaikan seluruh P0 assessment. Berikutnya masih diperlukan request DeepSeek riil `deepseek-flash` non-thinking; prompt/rubrik versioned terpisah; validasi shape/enum/ID/taksonomi/oversight; database jobs, retry, timeout, cache fingerprint dan status; hasil grouping lintas departemen; narasi per karyawan/departemen; dashboard hasil AI dan ranking; export PDF/Excel/results.json dari run lengkap. DomPDF terpasang dan memenuhi kebutuhan Composer, tetapi laporan PDF belum dibuat maupun dirender. Tidak ada inference, akurasi evaluasi, atau results.json palsu.

Tidak ada What-If, Flutter, Redis, microservices, atau fitur opsional yang dikerjakan. Runtime PHP CLI berasal dari runtime proyek lain yang sudah tersedia dan tidak diubah. Deploy/Apache PHP terpisah belum diuji.

## Inventaris file implementasi

File sumber utama yang dibuat/diubah (selain file standar scaffold dan lock dependency):

| Area | File |
|---|---|
| Setup | `.env` lokal (diabaikan Git), `.env.example`, `.gitignore`, `composer.json`, `composer.lock`, `package.json`, `phpunit.xml`, `README.md` |
| Routing/auth | `bootstrap/app.php`, `routes/web.php`, `routes/api.php`, `routes/console.php`, `config/sanctum.php`, `app/Providers/AppServiceProvider.php` |
| Konfigurasi/storage | `config/ftemation.php`, `config/filesystems.php` |
| Schema | `database/migrations/0001_01_01_000000_create_users_table.php`, migration cache/jobs bawaan, `database/migrations/2026_11_11_000001_create_workload_tables.php` |
| Model | `app/Models/User.php`, `WorkloadImport.php`, `Employee.php`, `Activity.php`, `AnalysisRun.php`, `ActivityGroup.php`, `ActivityAnalysis.php` |
| Seeder | `database/seeders/DatabaseSeeder.php`, `DemoUserSeeder.php`, `ActivityGroupSeeder.php`, `database/data/group_taxonomy.json` |
| Request | `app/Http/Requests/LoginRequest.php`, `ImportWorkloadRequest.php`, `ActivityIndexRequest.php` |
| Controller | `app/Http/Controllers/AuthController.php`, `ImportController.php` |
| Business logic | `app/Services/Workload/FteCalculator.php`, `WorkloadWorkbookReader.php`, `WorkloadImportService.php`, `WorkloadSummaryService.php` |
| Frontend | `frontend/src/main.tsx`, `app/`, `pages/`, `layouts/`, `components/`, `hooks/`, `lib/`, `types/`, `styles/`, serta konfigurasi di `frontend/` |
| Tes | `tests/Unit/FteCalculatorTest.php`, `tests/Feature/AuthenticationTest.php`, `WorkloadImportTest.php`, `SpaRoutingTest.php`, `scripts/smoke-http.mjs` |
| Referensi | Satu salinan aktif `AGENTS.md`, `docs/`, `references/`, dan `samples/`; folder starter kit duplikat sudah dihapus setelah verifikasi |
| Build lokal | `public/app/index.html` dan assets hasil Vite (diabaikan Git) |

Langkah menjalankan dan kredensial demo tersedia di [README](../README.md).
