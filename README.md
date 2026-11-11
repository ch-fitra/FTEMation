# FTEMation

AI-Powered Workload & Automation Intelligence. Laravel 13 REST API di root dan React + TypeScript di `frontend/`, dengan CSS biasa.

Tersedia autentikasi session/CSRF, import Excel, kalkulator FTE, analisis DeepSeek, grouping lintas departemen, kesimpulan karyawan/departemen, prioritas otomatisasi, dan export PDF/Excel/results.json. Analisis riil dataset referensi telah dijalankan; hasil dan batas pengujiannya ada di [laporan Fase 2](docs/PHASE_2_REPORT.md).

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

- Username: `akun demo`
- Password: `admin123`

Nama profil adalah `Demo`. Username, nama, dan password awal berasal dari `DEMO_USERNAME`, `DEMO_NAME`, serta `DEMO_PASSWORD` di `.env`. `DEMO_EMAIL` hanya menjadi identitas internal untuk memperbarui akun yang sama dan mempertahankan riwayat import; email tidak dipakai pada form/API login. Seeder menyelaraskan nama/username tanpa mengganti password akun yang sudah ada. Akun lokal sudah diperbarui dengan password di atas. Spesifikasi berada di `docs/`, studi kasus di `references/`, dan workbook di `samples/`.

## Instalasi pada mesin baru

Prasyarat: PHP 8.4, Composer, Node.js (saat pengujian: 24.15.0), npm, serta database MySQL/MariaDB **yang sudah tersedia** bernama `ftemation`. Ekstensi PHP: pdo_mysql, pdo_sqlite untuk tes, mbstring, fileinfo, xml, dom, simplexml, xmlreader, xmlwriter, zip, gd, iconv, curl, openssl, dan bcmath. Gunakan `php -v`, `php --ini`, dan `where.exe php` untuk memastikan CLI memakai PHP yang sesuai. PHP bawaan Apache XAMPP dapat berbeda dari PHP CLI.

```powershell
composer install
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
```

Edit `.env`: isi koneksi untuk **database `ftemation` yang sudah ada**, password MySQL jika diperlukan, `DEMO_USERNAME="akun demo"`, dan `DEMO_PASSWORD` minimal 8 karakter. `.env.example` tidak memuat rahasia. Konfigurasi lokal default memakai `DB_CONNECTION=mysql`, host `127.0.0.1`, port `3306`, user `root`, dan `utf8mb4_unicode_ci`.

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

Risk low/medium/high: 1/0,7/0,4. Effort low/medium/high: 1/0,75/0,5. Jika maxSavingRun=0, skor prioritas=0. Parameter ada di `config/ftemation.php` dan disalin ke snapshot tiap run. Laravel menghitung saving dan prioritas setelah hasil AI lolos validasi.

Laravel menghitung dan menyimpan FTE dengan 12 desimal. Ringkasan dihitung dari input tersimpan sebelum pembulatan tampilan, bukan penjumlahan FTE empat desimal dari UI. Dataset referensi diperiksa melalui tes, bukan nilai hasil yang di-hardcode:

- ACT-0001: 10 × 9 × 240 / 115200 = **0.1875 FTE**.
- Total 60 aktivitas: **4.4671875 FTE**.
- 12 karyawan dan 3 departemen, masing-masing 5 aktivitas/karyawan dan 20 aktivitas/departemen.

Aktivitas tercatat hanya cuplikan pekerjaan. Saving adalah estimasi kapasitas waktu, bukan keputusan pengurangan headcount. Keputusan berisiko tinggi tetap memerlukan manusia.

## API dan arsitektur

- `GET /sanctum/csrf-cookie`: inisialisasi CSRF.
- `POST /api/login`: username/password, session cookie; dibatasi 5 percobaan/menit per kombinasi username/IP. Username boleh mengandung spasi, maksimal 100 karakter.
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

## Menjalankan analisis AI

Isi `DEEPSEEK_API_KEY`, gunakan `DEEPSEEK_MODEL=deepseek-flash`, lalu jalankan migration dan worker pada terminal terpisah:

```powershell
php artisan config:clear
php artisan migrate
php artisan queue:work database --queue=analysis --timeout=360 --tries=40
```

Buka **Analisis AI** (`/analysis`), klik **Mulai analisis**. Status diperbarui otomatis; halaman boleh ditutup sementara worker berjalan. Request sungguhan mengirim nama/deskripsi aktivitas dan konteks departemen ke DeepSeek. Label jawaban dalam workbook evaluasi tidak dikirim. Kesimpulan menerima agregat Laravel dan rekomendasi prioritas, termasuk nama karyawan. Gunakan dataset yang diizinkan untuk dikirim ke penyedia AI.

Alternatif terminal untuk pengelola lokal:

```powershell
php artisan workload:analyze 1
# Setelah worker menyelesaikan run, gunakan ID run yang ditampilkan:
php artisan workload:export 1
```

Export CLI disimpan di `storage/app/private/exports/run-{id}/`; tombol pada halaman menghasilkan download dari run yang sama. Final export ditolak jika satu aktivitas atau kesimpulan belum sukses. JSON/Excel/PDF menampilkan hingga enam desimal; agregasi internal dihitung sebelum pembulatan.

Windows PHP yang belum memiliki CA bundle dapat memakai bundle Mozilla dari curl:

```powershell
New-Item -ItemType Directory -Force storage/app/private/certs
curl.exe --fail --silent --show-error https://curl.se/ca/cacert.pem -o storage/app/private/certs/cacert.pem
```

Set `DEEPSEEK_CA_BUNDLE=storage/app/private/certs/cacert.pem` di `.env`, lalu `php artisan config:clear` dan restart worker. Jika PHP sudah memiliki CA tepercaya, biarkan variabel ini kosong. Jangan menonaktifkan verifikasi TLS.

API tambahan (Sanctum + pemilik dataset):

- `GET/POST /api/imports/{id}/analyses`: riwayat / mulai run; start mengembalikan run aktif bila sudah ada.
- `GET /api/analyses/{id}`: progres, kegagalan, cache/token usage, hasil lengkap.
- `POST /api/analyses/{id}/retry`: ulangi aktivitas gagal atau kesimpulan gagal. Run aktif yang heartbeat-nya berhenti sepuluh menit juga dapat dipulihkan.
- `GET /api/analyses/{id}/export/{json|xlsx|pdf}`: download hasil lengkap.

Worker memproses batch lima aktivitas dengan lock database per run. Maksimal tiga percobaan HTTP per batch, jeda bertambah, timeout paling lama sembilan puluh detik/request. Error key/saldo/konfigurasi menghentikan run; error sementara dapat dicoba kembali lewat UI. `DB_QUEUE_RETRY_AFTER` harus lebih besar daripada timeout worker; default 420 detik. Windows tidak menyediakan semua mekanisme sinyal PCNTL; timeout HTTP tetap membatasi request dan heartbeat mendukung pemulihan manual.

Cache privat per pemilik selama tiga puluh hari memuat fingerprint model, endpoint, prompt/rubrik, taksonomi, dan konten aktivitas. Cache aktivitas dapat dipakai ulang ketika hanya asumsi saving berubah: angka tetap dihitung ulang dari snapshot run baru. Kesimpulan di-cache berdasarkan agregat dan prioritas sehingga diperbarui ketika angka berubah. Run dari cache dapat memiliki nol request/token dan `actual_model=null` karena tidak melakukan inference baru.

Prompt di `resources/prompts/`, orkestrasi/validator/provider/report/export di `app/Services/Analysis/`, job di `app/Jobs/`, dan halaman di `frontend/src/pages/AnalysisPage.tsx`. Jangan memasukkan kredensial ke prompt atau snapshot. Status lengkap tidak membuktikan penilaian AI selalu benar; pengguna tetap meninjau alasan, risiko, dan oversight.

## Metodologi penilaian AI

Sumber rubrik adalah `resources/prompts/activity-v1.txt` dan validasinya pada `AiOutputValidator`. Level merupakan penilaian teks oleh DeepSeek, bukan skor berbobot kelima faktor.

### Kriteria High

Sebagian besar langkah aktivitas dapat diotomatisasi menggunakan prosedur dan data yang cukup terstruktur. Human oversight tetap digunakan bila diperlukan. Prompt mensyaratkan mayoritas langkah administratif berulang, aturan jelas, input terstruktur, dan scope `majority_steps`. Human judgment high tidak boleh menghasilkan High.

### Kriteria Medium

Sebagian proses dapat diotomatisasi, tetapi masih memerlukan evaluasi manusia, pemeriksaan exception, atau keputusan kontekstual. Scope `partial_steps`; review/exception manusia masih signifikan.

### Kriteria Low

Aktivitas sangat bergantung pada judgment manusia, negosiasi, keputusan strategis, atau risiko tinggi sehingga AI lebih cocok sebagai pendukung. Scope `assist_only`. Risiko tinggi sendiri tidak otomatis menjadikan seluruh administrasi Low: keputusan konsekuensial tetap manusia, bantuan administratif dinilai terpisah. Kategori `high_impact_decision` wajib Low dan oversight.

### Lima faktor evaluasi

| Faktor | Pertanyaan yang dinilai (low/medium/high) |
|---|---|
| Repetitiveness | Seberapa berulang langkah dan pola aktivitas? |
| Rule clarity | Seberapa eksplisit aturan dan kriteria pencocokan? |
| Data structure | Seberapa terstruktur input dan data pendukung? |
| Human judgment | Seberapa besar kebutuhan interpretasi, negosiasi, atau keputusan kontekstual? |
| Operational risk | Seberapa besar konsekuensi kesalahan operasional? |

Automation scope mengartikan batas bantuan AI, bukan izin menjalankan keputusan final. Implementation effort adalah estimasi low/medium/high, bukan jumlah hari implementasi. Operational risk high atau human judgment high wajib oversight beserta catatan review/otoritas manusia. Pembayaran, perubahan rekening, rekrutmen/disiplin, keputusan strategis dan keselamatan tetap membutuhkan manusia berwenang.

Grouping memakai tepat satu dari 20 kategori tetap pada `database/data/group_taxonomy.json`, sesuai mekanisme dominan (entry, validasi, rekonsiliasi, reporting, investigasi, dan lainnya). Kemiripan departemen/kata tidak cukup. Level dan risiko dalam satu grup boleh berbeda; anggota dihitung sekali.

Rumus FTE, saving rate, dan priority score dijelaskan di bagian Perhitungan di atas. Saving rate adalah asumsi skenario deterministik, bukan prediksi persentase dari model. Snapshot `config_snapshot.calculation` menyimpan kapasitas, faktor tahunan, saving, risk dan effort ketika run dibuat. Report, export, serta KPI/metodologi Overview menggunakan completed run terbaru pada dataset; status tetap menunjukkan run terbaru jika run lain sedang berjalan/gagal. Tanpa completed run, Overview menampilkan baseline konfigurasi aktif tanpa saving. Halaman Analisis menampilkan snapshot run yang dipilih. Perubahan konfigurasi tidak menulis ulang run lama.

Model dikonfigurasi lewat `DEEPSEEK_MODEL` (default `deepseek-flash`), endpoint/key lewat `DEEPSEEK_BASE_URL` dan `DEEPSEEK_API_KEY` di `.env`; nama variabel lengkap ada pada `.env.example`. Alias model provider dapat berubah; `actual_model`, prompt/version, fingerprint, token, request count, status dan kegagalan disimpan untuk provenance. JSON mode, temperature 0, thinking disabled, validator enum/ID/oversight dan retry terbatas meningkatkan keandalan struktur, bukan jaminan kebenaran semantik.

Output dapat mengasumsikan dokumen/integrasi yang belum tersedia, meremehkan exception, atau memilih kategori ambigu. Verifikasi rekomendasi dengan pemilik proses sebelum implementasi. Review ACT-0002/0007/0009/0039 ada di [AI review](docs/AI_VERIFICATION.md). Kesesuaian 13/15 terhadap sampel evaluasi bukan akurasi umum model. Tidak ada label evaluasi dalam input inference, training, atau hasil palsu.

### Lifecycle queue dan pemulihan

Database queue menambah attempts setiap reservasi, termasuk setelah `release(15)`. Job mengizinkan 40 attempts (sekitar 10 menit contention), sedangkan `maxExceptions=1` membuat exception tak tertangani langsung gagal. Retry HTTP maksimal tiga kali ditangani provider; hasil sukses tidak dipilih ulang. Lock per run 400 detik melindungi satu step; timeout job/worker 360 detik, retry_after 420 detik. Jaga urutan **timeout < lock TTL < retry_after**. Callback failure mengambil lock yang sama, sehingga job duplikat yang exhausted tidak menandai run milik worker lain gagal. Run yang berhenti tanpa worker dapat dipulihkan melalui retry manual setelah heartbeat stale sepuluh menit. Retry contention berhenti pada batas attempts; tidak ada requeue tanpa batas untuk job tersebut.

Worker production sebaiknya Linux dengan PCNTL dan process manager agar timeout keras berlaku. Windows tanpa PCNTL tidak menjamin penghentian OS tepat pada timeout; jangan menjalankan beberapa worker Windows untuk inference nyata yang berpotensi melampaui TTL. Pengujian pemutusan OS dan beban multiworker hosting tetap perlu dilakukan. Transaksi database/cache tidak dapat menjamin exactly-once terhadap API eksternal bila proses mati sesudah respons diterima sebelum hasil tersimpan; cache dan hasil sukses menghindari pengulangan normal, bukan jaminan transaksi lintas provider.

## Konfigurasi production

- Gunakan `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://domain-anda`, HTTPS dan satu origin. Arahkan document root ke `public/`.
- Set `SESSION_SECURE_COOKIE=true`, session HttpOnly, SameSite=lax, `SANCTUM_STATEFUL_DOMAINS` sesuai hostname; jangan mematikan CSRF. Sesuaikan trusted proxy pada hosting yang memakai reverse proxy.
- Ganti password demo sebelum dipublikasikan. Seeder tidak mengganti password pengguna yang sudah ada: ubah lewat mekanisme pengelola yang aman. Jangan gunakan akun MySQL root XAMPP di hosting publik; gunakan user database terbatas khusus aplikasi.
- API key hanya pada `.env` server/secret store yang memasok env backend. Jangan gunakan prefix `VITE_` untuk secret. `.env` tidak boleh masuk Git, ZIP, web root, atau log. `.env.example` hanya placeholder; kredensial demo terdokumentasi khusus dataset sintetis.
- Jalankan worker database queue `analysis` dengan perintah di atas melalui process manager, restart worker setelah deploy. Pastikan database cache/queue/session tersedia; `DB_QUEUE_RETRY_AFTER=420` harus lebih besar dari timeout.
- Instal dependency dengan `composer install --no-dev --optimize-autoloader`, `npm --prefix frontend ci`, dan build. Lakukan migration terkontrol serta backup sesuai kebijakan hosting. Pastikan `storage/` dan `bootstrap/cache/` writable, file upload/exports tetap privat.
- Setelah env benar, jalankan `php artisan config:cache` dan `php artisan view:cache`; jangan cache konfigurasi sebelum env siap. Rotasi log, batasi akses log, monitor failed jobs/heartbeat/cache dan kapasitas disk. Jangan log header Authorization atau payload credential.
- Jalankan smoke test pada staging HTTPS sebelum publikasi. MySQL 8, hosting target, TLS cookie aktual dan pemulihan worker OS belum dibuktikan oleh tes lokal MariaDB.

Paket pengumpulan dibuat di `submission/` (diabaikan Git). Rekam video dari naskah yang disediakan, lalu unggah hanya setelah otorisasi pengguna. What-If dan Flutter tetap ditunda.
