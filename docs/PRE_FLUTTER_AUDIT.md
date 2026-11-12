# Pre-Flutter System Audit & Stabilization

Tanggal: 12 November 2026 (Asia/Jakarta). Keputusan: **NOT READY** untuk memulai integrasi Flutter Android end-to-end. Fondasi perhitungan dan lifecycle analisis lulus pengujian terisolasi, tetapi autentikasi akun lokal belum dapat diverifikasi end-to-end dan autentikasi token mobile belum tersedia. Perencanaan kontrak/layar dapat dilakukan; laporan ini bukan persetujuan production.

## Lingkup dan batas eksekusi

Audit membaca README, controller/routes, model, migration, auth provider, importer/calculator, layanan AI/report/export, queue/job/worker launcher, frontend/session/polling dan tes yang tersedia. Working tree awal bersih. Workbook fixture di `samples/` digunakan oleh suite import dan kalkulasi.

Tidak menjalankan worker operasional, DeepSeek nyata, reset/seeder, commit/push, atau perubahan skema. Job/HTTP fake hanya berjalan dalam SQLite in-memory. Tidak mengubah prompt atau rumus. Preview export ditulis ke `storage/framework/testing/quality/`, bukan direktori export historis. Tes HTTP login dapat menulis session/rate limiter; tidak mengirim mutasi workload. Tidak mencetak nilai password, API key, nama akun aktual atau koneksi rahasia.

## Temuan dan perbaikan

| Prioritas | Temuan/bukti | Status/tindak lanjut |
|---|---|---|
| P0 keamanan | Custom provider sebelumnya mengubah bcrypt/Argon menjadi plaintext setelah login berhasil; model tidak memiliki hashed cast. | Diperbaiki: hashed cast untuk write model, verifikasi hash lama tetap berlaku, plaintext lama hanya di-hash setelah login valid. Compare-and-swap mencegah upgrade menimpa perubahan password bersamaan. Tidak ada migrasi massal akun. |
| P0 sebelum publikasi | DB lokal masih memiliki 1 akun plaintext, belum login berhasil dalam audit. | Belum selesai pada data nyata. Rotasi/upgrade terkontrol akun lama diperlukan; kompatibilitas plaintext bersifat transisi. Jangan menulis password langsung melalui SQL. |
| P1 blocker integrasi | `smoke-http.mjs`: login demo dari env menghasilkan 422; pemeriksaan read-only membuktikan username demo terkonfigurasi tidak ditemukan di DB aktif. | Tidak mereset atau mengganti akun. Sesuaikan konfigurasi smoke dengan akun sah yang tersedia, lalu ulangi HTTP/browser live. Ini bukan bukti kegagalan algoritme login; tes auth terisolasi lulus. |
| P1 blocker mobile | Tidak ada `HasApiTokens`, tabel `personal_access_tokens`, issuance/revocation atau login token mobile. | Sengaja tidak dibuat pada tahap ini. Sanctum session web tetap dipertahankan. |
| P1 sebelum production | Environment local, debug=true, cookie secure=false; MariaDB 10.4.32; PCNTL tidak tersedia. | Layak pengujian lokal; perlu environment HTTPS/production, DB target terdukung, process manager dan pengujian timeout/recovery OS. |
| P2 operasional | Run #5 cancelled masih memiliki dua job lama, tanpa reservation/failed jobs; worker heartbeat `not_detected`. | Tidak dihapus. Tes membuktikan job cancelled/versi lama no-op terhadap provider. `not_detected` bukan kepastian proses OS mati. |

Nama `ReadablePasswordUserProvider` dipertahankan untuk perubahan terbatas dan kompatibilitas konfigurasi; perilakunya kini migrasi plaintext ke hash, bukan penyimpanan readable baru. README dan tes autentikasi diperbarui. File baru `scripts/pre-flutter-integrity.php` hanya membaca metadata aman.

## Database dan integritas historis

`php artisan migrate:status`: seluruh **7 migration Ran**, termasuk execution metadata dan cancellation metadata. Tidak ada migration pending; tidak perlu menjalankan migrate.

DB aktual: 4 imports, 54 employees, 270 activities, 20 activity groups, 5 analysis runs, 390 activity analyses. Run #1–#3 masing-masing 60 success/60 aktivitas; Run #4 90/90; semuanya completed. Run #5 cancelled, execution_version=0, 120 pending, 0 success, 0 request, 0 token.

Audit read-only menemukan 0 orphan pemilik import, 0 ketidaksesuaian dataset activity/employee, 0 ketidaksesuaian dataset analysis/activity, dan 0 upload privat hilang. FK serta unique index per import/run terdapat pada migration. Ini bukan pengganti uji pemulihan backup atau pemeriksaan kerusakan storage DB.

`verify-analysis-history.php` sebelum/sesudah menunjukkan hash identik:

| Tabel | SHA-256 |
|---|---|
| imports | `e353d9c1b6b51c70d0300445e986f1bc8089afaf85e67f32a61b3d9f64235648` |
| employees | `6ca357c69996d06afe3a6605ead1dbeb2ba2197bd2f463454283b35ae86c0d88` |
| activities | `2fbac55abad2e467470c4ee26ae19506a3add2ea7b25f30c8a530a9ae3b7e696` |
| activity_groups | `767883a706c68bb50ab4c83c47e3be72f50eba8be2f09f61ef245516f11016db` |
| analysis_runs | `7afbbb5b8ef41df4dbf0da0662656260cbffa74f4d0063e2d58b3e31cd0d03c5` |
| activity_analyses | `fa09d0cb062eda35cb85f960cdaf0b65b97364a4c64f680e34e03e4db22e3353` |

Hash report keempat completed run dan keenam file export historis juga identik dengan pemeriksaan awal. Snapshot akhir: `storage/framework/testing/pre-flutter-history-after.json`. Job hash saat diagnosis: `278e0e07b9f9a6d0959353b557f1f6e77a8feee4e4b039f1dcc9ffbef43d1c02`; tidak melakukan reserve/delete job.

`review-quality-exports.php` dijalankan untuk Run 1, 2, 3, 4: semuanya lulus, masing-masing 1.560/1.560/1.560/2.340 sel dibandingkan (**7.020 total**); enam sheet dipertahankan. FTE/saving memakai snapshot, grup mencakup seluruh aktivitas tepat sekali. Total Run #1–#3 FTE 4.467188/saving 1.672479; Run #4 FTE 16.164688/saving 5.764052 (pembulatan export). JSON/XLSX/PDF preview berhasil dibuat; tampilan PDF tidak dirender ulang dalam audit ini.

## Lifecycle AI dan antrean

Review kode dan tes fake memverifikasi:

- `queued → processing → completed`, validasi JSON/enum/ID/group/oversight, fatal provider error, retry parsial, dan export ditolak sebelum seluruh aktivitas serta summary selesai.
- Cancel queued tanpa worker langsung cancelled ketika mutex tersedia; job lama tetap aman. Cancel ketika HTTP berlangsung mencatat intent tanpa menunggu mutex; respons sukses/token/cache disimpan, kemudian checkpoint menghentikan batch berikutnya. Tidak menjanjikan pembatalan request yang sudah diterima provider.
- Cancel saat request gagal mencegah retry HTTP berikutnya; cancel saat summary sukses mempertahankan summary. Cancel tertunda dapat diperiksa kembali setelah sepuluh menit melalui aksi yang sama, tetap membutuhkan mutex tersedia.
- Resume pada ID/snapshot asli menambah execution_version, mempertahankan success dan billing, hanya mengantrekan bagian belum sukses. Resume berulang tidak menggandakan dispatch; versi stale ditolak; job legacy versi 0 tidak mengeksekusi versi baru.
- Mutex shared-cache per run, duplicate/expired reservation, contention attempts, callback failed, recovery tanpa job, dan larangan reset batch terkunci/reserved diuji. Cache privat per owner/fingerprint divalidasi kembali; perubahan asumsi memakai angka snapshot tanpa menulis ulang hasil lama.
- Konfigurasi nyata: timeout HTTP 90 detik, 3 attempts; timeout job 360 < lock TTL 400 < retry_after 420. Heartbeat TTL 420; ambang recovery 10 menit. Default queue database bernama `default`, tetapi dispatch dan launcher eksplisit memilih `analysis`.

Jaminan yang belum terbukti: concurrency MySQL dengan beberapa proses nyata, penghentian proses keras Windows, restart process manager, crash tepat setelah respons provider sebelum persistence, dan inference aktual. SQLite/fake tidak membuktikan exactly-once provider. Worker operasional tidak dinyalakan sesuai batasan.

## Keamanan web dan kesiapan API Flutter

Route data memakai `auth:sanctum` dan ownership (404 untuk dataset/run pengguna lain). Login web berada pada middleware web/CSRF, regenerasi session saat sukses; logout invalidasi session dan regenerasi CSRF. Rate limit login 5/menit per username/IP; aksi analisis/import dibatasi. Password/remember_token tersembunyi dari JSON. Axios memakai cookies/CSRF; tidak ditemukan penyimpanan token autentikasi di localStorage/sessionStorage. Upload disk lokal menunjuk `storage/app/private`; teks Excel diekspor literal. `.env` tidak dilacak Git; hanya `.env.example` dilacak. Pemeriksaan ini bukan secret scan seluruh riwayat Git.

| Kebutuhan Flutter | API yang tersedia | Catatan |
|---|---|---|
| Login/profil | POST `/api/login`, GET `/api/user` | Login saat ini session + CSRF, belum login token mobile. |
| Overview dataset | GET `/api/imports/{import}` | Summary/KPI dan completed snapshot tersedia; tidak ada Overview gabungan semua dataset. |
| Daftar dataset | GET `/api/imports` | Pagination 20, ownership. |
| Riwayat/progres/hasil | GET `/api/imports/{import}/analyses`, GET `/api/analyses/{run}` | Riwayat dibatasi 30; report lengkap hanya completed. Flutter harus menangani state cancelled/cancel_requested dan version. |
| Aktivitas/detail | GET `/api/imports/{import}/activities`, report activities dari GET run | Daftar paginated/filterable, detail hasil dapat dipilih lewat activity_id dalam report. Belum endpoint detail tunggal; tidak diperlukan untuk dataset saat ini. |
| Export | GET `/api/analyses/{run}/export/{format}` | json/xlsx/pdf, ownership dan completion gate. |

Tahap berikutnya perlu desain Sanctum personal access token berdampingan dengan session web: token terikat device/user, expiry, kemampuan minimal, revoke/logout token sendiri, rate limit dan pengujian ownership. Butuh trait/tabel infrastruktur Sanctum serta kontrak issuance/revocation pada pekerjaan terpisah. Flutter menyimpan token di penyimpanan aman OS, memakai Bearer HTTPS, menangani 401/403/409/422/429 serta pagination; tidak menyalin rumus atau akses provider. FTE, saving, prioritas, grouping, AI dan export tetap Laravel. Tidak ada endpoint/database/Flutter baru dalam audit.

## Bukti pengujian

| Pemeriksaan | Hasil aktual |
|---|---|
| `php artisan test --compact --no-ansi` | **96 passed, 3.049 assertions** setelah perbaikan; SQLite in-memory/fake. Termasuk hash lama tetap hash, upgrade plaintext hanya setelah login valid, hash tidak dapat dipakai sebagai password, concurrent password change tidak ditimpa. |
| `npm --prefix frontend run build` | Lulus TypeScript + Vite. |
| `npm --prefix frontend run lint` | Lulus oxlint. |
| `composer validate --no-check-publish`, `composer check-platform-reqs` | Lulus, PHP 8.4.26/Laravel 13.42.0. React 19.3.1, Router 7.18.5, Vite 8.3.8. |
| `composer audit --format=json`, `npm --prefix frontend audit --omit=dev --json` | 0 advisory Composer, 0 vulnerability npm production pada saat audit; bukan bukti tidak ada kerentanan aplikasi. |
| `review-analysis-cancellation.mjs` | Lulus 1440/390/320px; 8 lifecycle POST dipenuhi fixture; errors=[] dan mutations nyata=[]. |
| `review-analysis-queue.mjs` | Lulus 1440/390/320px, offline/delayed worker, polling setelah 503, recovery fixture; errors=[] dan mutations nyata=[]. |
| `review-analysis-navigation.mjs` | Lulus navigasi, deep link, scroll, progress/retry/empty dan mobile; tanpa mutasi API. |
| `review-responsive.mjs` | Lulus **63 pemeriksaan halaman**, 9 viewport 320/375/390/430/768/1024/1366/1920/2560px; findings=[], errors=[], mutations=[]. Respons API sintetis, bukan autentikasi nyata. |
| `php vendor/bin/pint --test`, `git diff --check` | Lulus pada keadaan akhir. Satu tes baru sempat salah memanggil provider tanpa nama; diperbaiki menjadi provider `users`, lalu seluruh 96 tes lulus. Format skrip audit baru dirapikan sebelum pemeriksaan Pint akhir. |
| `smoke-http.mjs` | Parsial: 401 guest, 419 tanpa CSRF, 204 CSRF cookie, 422 password salah lulus; login demo terkonfigurasi gagal 422. |
| `review-ai-result-review.mjs` | Gagal timeout menunggu department chart setelah login. Live hasil historis desktop/mobile belum terverifikasi akibat blocker akun. |

Artefak fixture browser: `storage/framework/testing/analysis-cancellation/`, `analysis-queue/`, `responsive/audit.json` beserta screenshot, dan hasil integrity `pre-flutter-integrity.json`. Artefak runtime diabaikan Git dan bukan final assessment. Tidak melakukan pengujian perangkat Android fisik/emulator, inference berbayar, maupun browser live yang membutuhkan akun valid setelah kegagalan login tersebut.

## Urutan penyelesaian blocker

1. P1: selaraskan kredensial pengujian dengan akun sah tanpa reset; ulangi smoke dan browser live pada dataset/run historis. P0: upgrade/rotasi plaintext lama terkontrol dan verifikasi jumlah plaintext menjadi nol sebelum publikasi.
2. P1: setujui kontrak autentikasi mobile Sanctum pada pekerjaan berikutnya; implementasikan dengan regresi login/logout web dan ownership. Jangan mengandalkan endpoint login session sebagai token login.
3. P1 production: siapkan HTTPS, debug off, secure cookie, DB target dan Linux/PCNTL/process manager. Setelah izin biaya terpisah, uji worker operasional/restart/recovery secara terkendali.
4. Setelah gate autentikasi dan live smoke terpenuhi, nilai ulang menjadi READY WITH NOTES untuk implementasi Flutter; backend tetap sumber kebenaran seluruh kalkulasi/AI. Tidak perlu redesign atau skema domain baru.
