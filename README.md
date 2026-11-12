# FTEMation

FTEMation adalah aplikasi assessment workload untuk studi kasus AI Insight Tancorp. Laravel menghitung FTE, estimasi saving, prioritas dan agregasi secara deterministik; DeepSeek menilai teks aktivitas. React menyediakan workspace web dan Flutter menyediakan client Android dengan REST API yang sama.

Fitur: import Excel, pemilihan dataset, dashboard, grouping lintas departemen, riwayat analisis, retry, cancel/resume dan export JSON/Excel/PDF. Saving adalah estimasi kapasitas waktu, bukan realisasi efisiensi atau dasar otomatis pengurangan pegawai.

## Stack dan struktur

Laravel 13 / PHP 8.4, MySQL/MariaDB, database queue/cache, Sanctum, PhpSpreadsheet dan DomPDF. Frontend memakai React, TypeScript, Vite, React Router, Axios dan CSS biasa. Android memakai Flutter/Dart, Dio, Provider, go_router dan secure storage.

| Direktori | Fungsi |
|---|---|
| `app/Http/`, `routes/` | REST API, autentikasi dan validasi request |
| `app/Services/Workload/` | Import, validasi workbook dan FTE |
| `app/Services/Analysis/`, `app/Jobs/` | Provider AI, validator, cache, queue dan export |
| `database/` | Migration, seeder dan taksonomi runtime |
| `frontend/src/` | App, pages, layouts, components, hooks, lib, types dan styles |
| `mobile/` | Client Flutter Android |
| `resources/prompts/` | Prompt aktivitas/kesimpulan berversi |
| `resources/views/reports/` | Template PDF |
| `samples/` | Dataset dan rubrik evaluasi studi kasus |
| `docs/` | ERD, spesifikasi dan sumber studi kasus |
| `storage/` | Upload/export privat, sertifikat, cache, session dan log runtime |

Tujuh tabel domain: users, imports, employees, activities, analysis_runs, activity_groups dan activity_analyses. Tabel infrastruktur Laravel/Sanctum diperbolehkan di luar tujuh tabel tersebut.

## Instalasi

Prasyarat: PHP 8.4, Composer, Node.js/npm dan database MySQL/MariaDB khusus aplikasi. Ekstensi PHP: pdo_mysql, fileinfo, xml/dom/simplexml/xmlreader/xmlwriter, zip, gd, iconv, curl, openssl, mbstring dan bcmath. Versi dikunci dalam composer.lock, frontend/package-lock.json dan mobile/pubspec.lock.

```powershell
composer install
if (-not (Test-Path -LiteralPath .env)) {
    Copy-Item -LiteralPath .env.example -Destination .env
}
```

Isi koneksi database, akun demo dan konfigurasi AI di .env. Buat database khusus aplikasi terlebih dahulu. Perintah berikut ditujukan untuk instalasi baru; jangan mengganti APP_KEY pada instalasi existing. Verifikasi target koneksi dan backup sebelum migration pada database berisi data.

```powershell
php artisan key:generate
php artisan ftemation:check-database
php artisan migrate
php artisan db:seed
npm --prefix frontend ci
npm --prefix frontend run build
composer dev
```

Seeder memakai DEMO_USERNAME, DEMO_NAME, DEMO_EMAIL dan DEMO_PASSWORD; tidak mengganti password akun existing. Ganti password demo sebelum publikasi. Jangan memakai migrate:fresh, db:wipe, DROP atau TRUNCATE pada database pengguna.

## Menjalankan web dan worker

`composer dev` menjalankan server di http://localhost:8000 yang menyajikan build React. Untuk mengembangkan React jalankan terminal kedua:

```powershell
npm --prefix frontend run dev
```

Buka http://localhost:5173. Vite mem-proxy /api dan /sanctum ke Laravel. Gunakan hostname localhost secara konsisten untuk cookie/CSRF. Hentikan setiap server/worker melalui Ctrl+C pada terminalnya.

Analisis memerlukan DEEPSEEK_API_KEY di backend dan worker terpisah. Jalankan hanya setelah menyetujui biaya provider:

```powershell
php artisan workload:work --allow-paid
```

Model default deepseek-flash; pengaturan lengkap tersedia di .env.example. Setelah perubahan env gunakan `php artisan config:clear` dan restart worker. Jika CA PHP belum tersedia, arahkan DEEPSEEK_CA_BUNDLE ke CA bundle tepercaya; jangan menonaktifkan TLS. Sertifikat yang dirujuk konfigurasi lokal harus tetap tersedia.

## Dataset dan penggunaan

Login, import `samples/FTEMation_Workload_Dataset_v1.xlsx`, tinjau Overview/Data aktivitas, kemudian mulai analisis bila biaya AI diizinkan. Analisis AI memantau antrean dan menyediakan retry/cancel/resume. Hasil analisis memilih riwayat run dan menyediakan export setelah seluruh aktivitas serta kesimpulan sukses. Pilihan dataset berlaku di seluruh workspace. KPI memakai completed run terbaru; status dapat menunjukkan run terbaru yang belum selesai.

Workbook wajib .xlsx, maksimal 5 MB, tepat satu sheet Workload dengan sembilan header berurutan:

```text
activity_id, employee_id, employee_name, department, activity_name, description, frequency, volume, duration_minutes
```

Nilai wajib terisi; ID aktivitas unik per import; identitas karyawan konsisten; frekuensi daily/weekly/monthly; volume dan durasi positif. Formula ditolak, error dilaporkan per baris. Import memakai transaksi dan penyimpanan privat. Template tersedia di endpoint privat /api/import-template.

Dataset sintetis referensi berisi 60 aktivitas, 12 karyawan dan 3 departemen. Workbook evaluasi terpisah merupakan rubrik studi kasus, bukan jawaban yang dikirim ke model.

## Perhitungan dan AI

```text
annual_minutes = volume * duration_minutes * annual_factor
FTE = annual_minutes / annual_capacity_minutes
annual_factor: daily=240, weekly=48, monthly=12
annual_capacity_minutes=115200
saving = FTE * saving_rate
saving_rate: high=0.6, medium=0.3, low=0.1
priority = 100 * (saving / maxSavingRun) * riskFactor * effortFactor
risk low/medium/high: 1 / 0.7 / 0.4
effort low/medium/high: 1 / 0.75 / 0.5
```

Priority nol bila maxSavingRun nol. Total dataset referensi 4.4671875 FTE. Snapshot perhitungan melekat ke run; konfigurasi baru tidak menghitung ulang histori. UI memakai empat desimal dan export enam desimal. FTE di atas satu perlu verifikasi periode, volume dan pembagian pekerjaan.

Run baru memakai activity-v2 dan summary-v2; prompt v1 tetap tersedia untuk histori. Retry/resume memakai snapshot asli. Cache privat per pemilik mencakup fingerprint input, model, prompt dan taksonomi. Model/prompt, request/status/failure, token jika tersedia dan provenance cache disimpan.

Backend memvalidasi JSON shape, enum, ID, grouping dan oversight dengan retry terbatas. Grouping memakai 20 kategori di database/data/group_taxonomy.json. Risiko/judgment tinggi wajib kontrol manusia. Perbedaan level dalam grup dapat valid; kandidat review bukan bukti kesalahan AI. JSON valid tidak membuktikan reasoning benar, integrasi tersedia, atau akurasi model. Review pemilik proses tetap diperlukan.

Export otomatis hanya tersedia untuk completed run dengan seluruh aktivitas/kesimpulan sukses:

```powershell
php artisan workload:analyze <import-id>
php artisan workload:export <completed-run-id>
```

Analyze mengantrekan pekerjaan berbayar. Export menulis JSON/XLSX/PDF di storage/app/private/exports/run-<id>/. Pertahankan hasil historis dan snapshot aslinya.

## Troubleshooting antrean

Pastikan worker mendengarkan koneksi database dan queue analysis. queue_health.not_detected berarti tidak ada sinyal baru, bukan kepastian proses OS mati. Heartbeat berlaku 420 detik. Job yang menunggu tidak membutuhkan dispatch ulang; retry tidak menyalakan worker. Run aktif tanpa heartbeat/job selama 10 menit dapat dipulihkan melalui UI pada run yang sama. Jangan menghapus job atau mereset progres manual.

Timeout job 360 detik, mutex 400 detik, DB_QUEUE_RETRY_AFTER=420: pertahankan timeout < mutex < retry_after. Cancel menyelesaikan request in-flight pada titik aman dan masih dapat menimbulkan biaya. Resume hanya melanjutkan bagian belum sukses. Exactly-once lintas provider/database tidak dijamin bila proses mati sebelum persistence. Linux/PCNTL dianjurkan untuk hard timeout; Windows tidak menjamin penghentian proses OS tepat pada batas waktu.

## Android

Lihat [README mobile](mobile/README.md) untuk Flutter, API_BASE_URL, emulator/USB, kontrak token, build APK dan batas release. React memakai session/cookie Sanctum dengan CSRF; Android memakai token per perangkat di secure storage. Migration Sanctum disertakan; periksa status pada setiap database tujuan.

## Keamanan dan batas operasional

Deployment memakai HTTPS, satu origin, document root public/, APP_ENV=production, APP_DEBUG=false, SESSION_SECURE_COOKIE=true, hostname Sanctum/trusted proxy yang sesuai, session HttpOnly dan SameSite=lax. Jangan mematikan CSRF.

Akun plaintext legacy ditingkatkan menjadi hash setelah login web sah; mobile menolak akun plaintext. Rotasi akun legacy dilakukan secara terkontrol. Simpan secret di .env backend, bukan variabel VITE_, Git, URL atau log. Upload/export privat dan endpoint dilindungi autentikasi/ownership. Teks Excel diekspor sebagai literal untuk mencegah formula injection.

Kelola worker dengan process manager, restart setelah deploy, pastikan storage/bootstrap cache writable, pantau failed jobs/kapasitas disk dan rotasi log. Hosting target, HTTPS, pemulihan proses, backup/recovery dan skala dataset nyata memerlukan verifikasi deployment. Build lokal belum membuktikan kesiapan production.

## Pemeliharaan

Pertahankan Laravel di root, React SPA di frontend/ dan Flutter Android di mobile/. Frontend memakai src/app untuk bootstrap/navigasi, pages, layouts, components, hooks, lib, types dan styles. Gunakan REST JSON, Axios dan CSS biasa. Business logic workload berada di app/Services/Workload/; orkestrasi AI di app/Services/Analysis/. Angka FTE/saving dihitung Laravel, bukan client atau model AI.

Lifecycle analisis: queued/processing -> cancel_requested -> cancelled -> queued saat resume -> completed. POST /api/analyses/{run}/cancel dan /resume membawa execution_version dari status server; versi/state stale menghasilkan 409. Ownership tetap berlaku. Hasil sukses, snapshot, usage dan cache dipertahankan saat resume. Setelah pembatalan tanpa heartbeat selama 10 menit, UI dapat meminta acknowledgement ulang; periksa worker yang mungkin masih hidup sebelum pemulihan manual.

High berarti mayoritas langkah dapat diotomasi, Medium sebagian langkah dengan review/exception signifikan, dan Low berupa bantuan untuk judgment manusia. Boolean oversight perlu dibaca bersama catatan: false bukan jaminan tanpa kontrol manusia. Keputusan berisiko tetap di tangan manusia. Kandidat review beda level tidak mendeteksi semua inkonsistensi atau halusinasi.

Paket source ini tidak menyertakan suite pengujian atau skrip QA. Dependency pengembangan tetap dikunci untuk kompatibilitas instalasi dan pemeliharaan; Composer juga menyediakan Pint, sedangkan React/Flutter memiliki konfigurasi lint masing-masing. Perubahan autentikasi, ownership, queue, lifecycle dan perhitungan memerlukan verifikasi regresi sebelum deployment.

Dokumentasi studi kasus: [panduan dataset](docs/DATASET_GUIDE.md), [ERD](docs/ERD_v1.mmd), [PRD assessment](docs/PRD_v1.1.md), [keputusan stack](docs/TECH_STACK_DECISIONS_v1.1.md), dan [sumber assessment](<docs/references/Studi Kasus AI Insight.pdf>). PRD/ERD awal merupakan referensi assessment; migration dan kode aktif mencakup tambahan lifecycle/mobile.
