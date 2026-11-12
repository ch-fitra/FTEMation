ï»¿# FTEMation

Aplikasi assessment workload: import Excel, perhitungan FTE, analisis DeepSeek, grouping lintas departemen, dashboard, prioritas, dan export JSON/Excel/PDF.

Hasil final assessment dipilih dari **Run #1 / Import #1**, workbook utama 60 aktivitas, model `deepseek-flash`, prompt **activity-v1 / summary-v1**. Pasangan workbook dan `results.json` terverifikasi disiapkan di `../FTEMation-Archive-2026-11-11/submission/final-run-1/`, beserta manifest SHA-256. Lihat [keputusan hasil final dan review perbedaan evaluasi](docs/FINAL_ASSESSMENT_REVIEW.md). Default v2 pada kode berlaku untuk run baru; hasil final ini tetap v1 dan tidak membuktikan efektivitas inference v2. Run #4 (90 aktivitas) bukan bagian pasangan final ini.

## Stack dan struktur

Laravel 13 / PHP 8.4 di root repository; React + TypeScript + Vite di `frontend/`. REST JSON + Axios, Sanctum session/CSRF, Vanilla CSS, MySQL/MariaDB, database queue/cache, PhpSpreadsheet dan DomPDF.

| Folder | Fungsi |
|---|---|
| `app/Http/` | Controller dan validasi request |
| `app/Services/Workload/` | Import, validasi workbook, FTE dan summary |
| `app/Services/Analysis/` | Provider AI, validator, cache, orkestrasi dan export |
| `app/Jobs/` | Job analisis dengan lock per run |
| `database/` | Migration, seeder dan taksonomi runtime |
| `frontend/src/` | App, pages, layouts, components, hooks, lib, types dan CSS |
| `resources/prompts/` | Prompt aktivitas/kesimpulan versioned |
| `resources/views/reports/` | Template laporan PDF |
| `tests/` | Unit, feature dan regression tests |
| `samples/` | Workbook input dan fixture evaluasi yang dipakai tes |
| `scripts/` | Smoke HTTP dan pemeriksaan UI regresi |
| `storage/` | Upload/export privat, sertifikat, session, cache dan log runtime |

Tujuh tabel domain: users, imports, employees, activities, analysis_runs, activity_groups, activity_analyses. Tabel infrastruktur Laravel diperbolehkan.

## Menjalankan aplikasi lokal

Nyalakan MySQL/MariaDB. Dari root repository:

```powershell
php artisan ftemation:check-database
composer dev
```

Buka **http://localhost:8000/**. Build React disajikan oleh Laravel. Akun demo lokal: username `akun demo`, password `admin123`. Konfigurasi awal akun ada pada `DEMO_USERNAME`, `DEMO_NAME`, `DEMO_EMAIL`, `DEMO_PASSWORD` di `.env`. Seeder tidak mengganti password akun yang sudah ada. Password baru disimpan sebagai hash. Akun plaintext lama tetap dapat login dan otomatis ditingkatkan menjadi hash setelah autentikasi berhasil; hash lama tidak pernah dikonversi menjadi plaintext. Jangan mengedit password langsung melalui SQL. Akun lama yang belum login masih memerlukan rotasi/peningkatan terkontrol sebelum production. Password disembunyikan dari respons API.

Untuk mengembangkan frontend, jalankan terminal kedua:

```powershell
npm --prefix frontend run dev
```

Buka http://localhost:5173. Vite mem-proxy `/api` dan `/sanctum` ke Laravel port 8000. Gunakan hostname `localhost` secara konsisten.

Analisis baru memerlukan API key dan worker pada terminal terpisah:

```powershell
php artisan workload:work --allow-paid
```

**Menghentikan aplikasi:** tekan Ctrl+C pada setiap terminal server, Vite dan worker. Menutup browser tidak menghentikan server. Jika server masih berjalan, periksa PID terlebih dahulu:

```powershell
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in 8000,5173 } |
    Select-Object LocalPort,OwningProcess
# Pastikan PID milik FTEMation sebelum menghentikannya:
# Stop-Process -Id <PID>
```

## Instalasi pada mesin baru

Prasyarat: PHP 8.4, Composer, Node.js/npm, dan database MySQL/MariaDB khusus aplikasi yang sudah dibuat. Ekstensi PHP mencakup pdo_mysql, pdo_sqlite untuk tes, fileinfo, xml/dom/simplexml/xmlreader/xmlwriter, zip, gd, iconv, curl, openssl, mbstring dan bcmath. Verifikasi runtime dengan `php -v`, `php --ini`, dan `composer check-platform-reqs`.

```powershell
composer install
if (-not (Test-Path -LiteralPath .env)) {
    Copy-Item -LiteralPath .env.example -Destination .env
}
```

Edit `.env`: isi koneksi database, akun demo, dan konfigurasi AI bila diperlukan. Jangan menimpa env atau database pengguna yang sudah ada.

```powershell
php artisan key:generate
php artisan ftemation:check-database
# Jalankan migration hanya setelah koneksi database tujuan benar.
php artisan migrate
php artisan db:seed
npm --prefix frontend ci
npm --prefix frontend run build
composer dev
```

Jangan gunakan `migrate:fresh`, `db:wipe`, DROP atau TRUNCATE pada database pengguna. Instalasi baru tidak memuat hasil inference dari database komputer lain.

## Import dan penggunaan

1. Login dan buka Import dataset.
2. Pilih `samples/FTEMation_Workload_Dataset_v1.xlsx`.
3. Validasi dan import; tinjau Overview serta Data aktivitas.
4. Untuk inference baru yang diotorisasi, buka Analisis AI dan mulai analisis dengan worker aktif.
5. Tinjau alasan/rekomendasi, grouping, ringkasan karyawan/departemen dan prioritas.
6. Download results.json, XLSX atau PDF setelah seluruh aktivitas dan kesimpulan lengkap.

Workbook harus `.xlsx`, maksimal 5 MB, tepat satu sheet `Workload`, dengan sembilan header berurutan:

```text
activity_id, employee_id, employee_name, department, activity_name, description, frequency, volume, duration_minutes
```

Seluruh nilai wajib; ID aktivitas unik per import; identitas karyawan konsisten; frekuensi daily/weekly/monthly; volume dan durasi positif. Formula ditolak. Error ditampilkan per baris. Import memakai transaksi dan file disimpan privat di `storage/app/private/imports/`.

Dataset referensi sintetis: 60 aktivitas, 12 karyawan, 3 departemen. Workbook evaluasi terpisah dipakai untuk review, tidak diimpor sebagai workload dan tidak dikirim sebagai jawaban ke model.

## Perhitungan FTE dan saving

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

Jika maxSavingRun nol, priority nol. ACT-0001=0.1875 FTE; total referensi=4.4671875 FTE. Laravel menghitung semua angka sebelum pembulatan; UI empat desimal dan export enam desimal.

Asumsi disimpan pada `config_snapshot.calculation` setiap run. Dashboard menggunakan completed run terbaru untuk total, saving, remaining, departemen dan metodologi; status menunjukkan run terbaru meskipun masih berjalan/gagal. Tanpa completed run, baseline memakai konfigurasi aktif tanpa saving. Report yang dipilih dan ketiga export memakai snapshot run yang sama. Perubahan konfigurasi tidak menulis ulang run lama.

Aktivitas tercatat hanya cuplikan pekerjaan. Saving merupakan estimasi kapasitas waktu, bukan realisasi efisiensi atau keputusan pengurangan pegawai.

## Penilaian AI dan reliability

Model default `deepseek-flash`; konfigurasi backend melalui `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL` dan variabel pada `.env.example`. Jangan menaruh secret pada variabel frontend `VITE_`. Setelah perubahan env, jalankan `php artisan config:clear` dan restart worker.

- **High:** mayoritas langkah administratif berulang, aturan jelas dan data cukup terstruktur; scope `majority_steps`. Oversight tetap digunakan bila diperlukan.
- **Medium:** sebagian langkah dapat diotomasi, tetapi exception/review atau keputusan kontekstual manusia signifikan; scope `partial_steps`.
- **Low:** inti aktivitas bergantung pada judgment, negosiasi, interpretasi, keputusan strategis/konsekuensial manusia; scope `assist_only`.

Lima faktor low/medium/high: repetitiveness (pengulangan), rule clarity (kejelasan aturan), data structure (struktur input), human judgment (kebutuhan penilaian manusia), operational risk (konsekuensi kesalahan). Implementation effort adalah estimasi kesulitan, bukan durasi. Human judgment high tidak boleh High; judgment/risk high wajib oversight dan catatan otoritas manusia. Keputusan berisiko tetap manusia.

Grouping memilih satu dari 20 kategori pada `database/data/group_taxonomy.json`, berdasarkan mekanisme dominan, bukan kesamaan departemen/kata. Level dan risiko satu grup boleh berbeda; anggota dihitung sekali.

Prompt terpisah/versioned, JSON mode, thinking disabled dan temperature nol. Laravel memvalidasi shape, enum, ID unik, kategori dan oversight. Model aktual, prompt/snapshot, request/status/failure, token dan cache provenance disimpan. Validasi struktur tidak menjamin kebenaran semantik: rekomendasi dapat mengasumsikan dokumen atau integrasi yang belum tersedia. Konfirmasi dengan pemilik proses sebelum implementasi. Kesesuaian 13/15 label sampel bukan akurasi umum model.

Database queue memproses batch; maksimal tiga retry HTTP. Cache privat per pemilik memuat fingerprint konten/model/prompt/taksonomi. Hasil sukses tidak dipilih ulang saat retry bagian gagal. Cache aktivitas dapat digunakan ketika hanya asumsi saving berubah; kesimpulan mengikuti agregat baru.

Lock per run 400 detik, timeout 360 detik, `DB_QUEUE_RETRY_AFTER=420`: pertahankan timeout < lock TTL < retry_after. Release contention menghabiskan queue attempt: job dibatasi 40 attempts dengan `maxExceptions=1` untuk fatal exception. Callback gagal tidak merusak run yang sedang dipegang worker lain. Run stale sepuluh menit dapat dipulihkan lewat retry manual. Linux PCNTL dianjurkan untuk timeout keras; Windows tidak menjamin penghentian OS pada batas timeout. Exactly-once lintas provider dan database tidak dijamin jika proses mati sebelum persistence.

Jika CA bundle PHP belum tersedia, atur `DEEPSEEK_CA_BUNDLE` ke file CA tepercaya; jangan nonaktifkan verifikasi TLS. Sertifikat lokal pada storage tetap diperlukan bila dikonfigurasi.

Perintah pengelola:

```powershell
php artisan workload:analyze <import-id>
php artisan workload:export <completed-run-id>
```

Perintah analyze mengantrekan inference yang dapat menimbulkan biaya. Export hanya membaca completed run dan menulis ketiga format ke `storage/app/private/exports/run-<id>/`.

## Pengujian

```powershell
php artisan test --compact
php vendor/bin/pint --test
composer validate --no-check-publish
composer check-platform-reqs
npm --prefix frontend run build
npm --prefix frontend run lint
node scripts/smoke-http.mjs
```

PHPUnit dipaksa SQLite in-memory melalui `phpunit.xml`; provider AI memakai fakes. Smoke HTTP membutuhkan server lokal dan akun demo dari env; tanpa `--import` tidak menambahkan dataset atau inference. `scripts/review-audit-fixes.mjs` adalah tes browser tambahan yang membutuhkan Playwright/Chrome pada environment review, bukan dependency runtime aplikasi. `node scripts/review-ui-revisions.mjs` memeriksa dropdown mouse/keyboard, drag-and-drop dan validasi file tanpa mengirim import, riwayat analisis, layout responsif, serta logout otomatis. Kedua skrip membutuhkan server lokal dan akun demo dari env; tidak menjalankan inference AI.

## Production dan keamanan

Gunakan `APP_ENV=production`, `APP_DEBUG=false`, HTTPS dan satu origin; document root harus `public/`. Set `SESSION_SECURE_COOKIE=true`, session HttpOnly, SameSite=lax, hostname Sanctum sesuai domain, dan trusted proxy sesuai hosting. Jangan mematikan CSRF.

Ganti password demo sebelum publikasi dan gunakan user database terbatas, bukan root XAMPP. Simpan key hanya di env backend; jangan masukkan env, password nyata, session atau upload privat ke Git/ZIP/log. Endpoint data/export dilindungi Sanctum dan ownership; upload tetap privat; teks Excel diekspor sebagai literal untuk mencegah formula injection.

Jalankan worker melalui process manager; restart setelah deploy. Pastikan storage dan bootstrap/cache writable, monitor failed jobs/heartbeat, rotasi log dan kapasitas disk. Setelah env siap, gunakan config/view cache. Hosting target, MySQL 8, HTTPS aktual dan pemulihan proses OS perlu diuji pada lingkungan deployment.

Dokumen assessment, laporan historis, artefak review dan paket pengumpulan telah dipindahkan ke `../FTEMation-Archive-2026-11-11/`. Berkas tersebut tidak diperlukan untuk menjalankan aplikasi.

## Penyempurnaan kualitas AI dan laporan

Run baru memakai `activity-v2` dan `summary-v2`. Prompt v1 tetap tersedia; retry run lama tetap memakai snapshot prompt aslinya. Fingerprint memuat isi kedua prompt sehingga cache v1 tidak digunakan sebagai jawaban v2. Restart worker setelah perubahan kode/config; jangan mulai inference baru tanpa otorisasi biaya API.

Prompt v2 melarang klaim dokumen, sistem, integrasi, SOP, threshold dan toleransi yang belum dibuktikan input. Rekomendasi dimulai dari data tersedia; solusi tambahan dinyatakan sebagai opsi bersyarat. Invoice dan PO mendukung usulan two-way matching; three-way matching memerlukan konfirmasi data penerimaan barang. Ringkasan karyawan/departemen mengikuti batas bukti yang sama. JSON valid tidak membuktikan reasoning benar atau semua halusinasi terdeteksi.

Halaman Analisis menampilkan kandidat review untuk grup dengan level berbeda, beserta alasan masing-masing aktivitas. Perbedaan dapat valid karena langkah, exception, judgment dan risiko; kategori sama tidak memaksa label identik. Lima pasangan sintetis diuji offline dengan fake provider sebagai kontrak/rubrik referensi, bukan pengukuran akurasi model atau ground truth ahli domain.

Human oversight dijelaskan sebagai persetujuan rutin setiap transaksi, review pengecualian, dan kewenangan keputusan final manusia. Boolean historis tetap utuh: `false` bukan jaminan proses tanpa manusia. Lihat rekomendasi/catatan untuk kondisi exception dan konfirmasi penanggung jawab dengan pemilik proses. Risiko/judgment tinggi dan kategori keputusan berdampak tinggi tetap wajib kontrol manusia.

Dashboard memberi catatan informatif ketika aktivitas individu melebihi satu FTE, dan kartu karyawan menjelaskan perlunya verifikasi periode, pembagian pekerjaan serta durasi aktual. FTE tidak dibatasi satu dan tidak menjadi penilaian kinerja atau keputusan headcount.

Overview Excel menampilkan metadata run, KPI kapasitas waktu, distribusi level dan panduan interpretasi dalam bagian terpisah. Seluruh enam sheet dipertahankan; Activities tetap berisi data pemeriksaan. Angka memakai snapshot run dan pembulatan enam desimal. Teks pengguna ditulis sebagai literal, termasuk metadata. Export baru dapat memakai presentasi terbaru dengan hasil AI historis tetap sama; berkas export lama tidak ditimpa oleh pemeriksaan.

Panduan: [metodologi](docs/METHODOLOGY.md), [evaluasi AI](docs/AI_VERIFICATION.md), dan [laporan penyempurnaan](docs/AI_QUALITY_REFINEMENT_REPORT.md).

Pemeriksaan tambahan tanpa inference:

```powershell
php scripts/verify-analysis-history.php
php scripts/review-quality-exports.php 4
node scripts/review-ai-quality.mjs
```

Skrip pertama hanya membaca tabel domain dan menghitung hash; tidak mencetak kredensial atau isi data pribadi. Skrip kedua membaca completed run, memeriksa perhitungan dan kesetaraan Excel/JSON, lalu menulis preview ke `storage/framework/testing/quality/`, bukan folder export historis. Skrip browser memerlukan Playwright pada folder sementara `ftemation-ui-review` dan Chrome; memeriksa Run #4 secara read-only serta memblokir mutasi selain login/logout.

## Decision workspace dan verifikasi UI

Menu **Panduan & Q&A** (`/help`) memusatkan rumus FTE, asumsi dataset aktif, cara membaca hasil, kontrol manusia, grouping, retry dan export. Overview memakai satu judul peluang dengan kartu seragam; deskripsi ditampilkan untuk semua kartu hanya bila seluruh rekomendasi tersedia. Grafik departemen menyediakan periode jam tahunan atau rata-rata bulanan/mingguan/harian dari faktor snapshot. Rasio FTE tetap; konversi periode mengubah jam workload, saving dan kapasitas dengan pembagi yang sama, bukan tren kalender aktual. Tombol hasil pada header Overview dihapus; hasil tetap melalui menu Hasil analisis atau detail peluang.

Navigasi workspace: Overview, Import dataset, Analisis AI, Hasil analisis, lalu Data aktivitas. Analisis AI (`/analysis`) digunakan untuk memulai analisis, memantau progres dan retry bagian gagal. Hasil analisis (`/results`) digunakan untuk memilih riwayat run, membaca rekomendasi/detail dan mengunduh export; tanpa pilihan run, halaman memilih completed run terbaru. KPI dan peluang teratas hanya ditampilkan di Overview. Data aktivitas berisi input Excel dan FTE deterministik untuk dataset aktif, bukan gabungan seluruh dataset atau hasil penilaian AI. Dataset lain tetap disimpan dan dapat dipilih di Import dataset. Perpindahan halaman atau dataset mereset scroll ke atas; membuka/menutup detail aktivitas tetap mempertahankan posisi halaman hasil.

Pemeriksaan navigasi dan scroll dengan API sintetis tanpa inference/mutasi: `node scripts/review-analysis-navigation.mjs` (server lokal dan Playwright/Chrome diperlukan seperti skrip UI lainnya).

Overview menampilkan KPI dan tiga prioritas dari completed run yang sama. Pemilih Dataset aktif ditampilkan di tengah header Overview, Hasil analisis dan Data aktivitas; hanya label dan nama file yang ditampilkan. Pilihan dataset tetap digunakan di seluruh workspace. Tautan detail menggunakan `dataset`, `run`, dan `activity` pada URL. Pergantian dataset mereset halaman aktivitas/analisis dan mengabaikan respons lama. Template Excel tersedia pada halaman Import melalui endpoint privat `/api/import-template`.

Jalankan `node scripts/review-ui-ux.mjs` dengan server lokal aktif dan Playwright/Chrome tersedia pada folder sementara `ftemation-ui-review`. Skrip memakai respons API sintetis terisolasi, memblokir seluruh mutasi API, memeriksa enam breakpoint serta race pergantian dataset, dan menyimpan screenshot di `storage/framework/testing/ui-ux/`. Tidak menjalankan inference. Lihat [laporan UI/UX](docs/UI_UX_REFINEMENT_REPORT.md) dan [panduan desain](docs/UI_DESIGN.md).

Audit responsif delapan viewport (320â€“2560px): `node scripts/review-responsive.mjs` dan `node scripts/review-responsive.mjs --stress`. Keduanya memakai API sintetis, memblokir mutasi, dan menguji login, seluruh halaman workspace, dropdown/keyboard, tabel, lima tampilan hasil, dialog serta Q&A. `node scripts/review-header-loading.mjs` memeriksa stabilitas header saat loading, refresh dan navigasi. Lihat [laporan responsivitas](docs/RESPONSIVE_UI_REVIEW.md); screenshot dan audit tersimpan di `storage/framework/testing/responsive/` serta `responsive-stress/`.


Pemeriksaan Hasil AI pada Hasil analisis menampilkan kandidat `consistency_review` sebagai daftar kategori dengan jumlah aktivitas dan variasi level. Tiga kelompok ditampilkan lebih dahulu; tombol lihat semua membuka daftar lengkap. Detail kelompok menampilkan seluruh aktivitas, alasan klasifikasi, dan faktor yang tersedia dalam satu dialog. Label kategori bahasa Indonesia hanya untuk tampilan; hasil, ID kategori, serta logika backend tetap sama. Perbedaan level belum tentu kesalahan AI.

Verifikasi read-only terhadap hasil tersimpan: `node scripts/review-ai-result-review.mjs`. Memerlukan server lokal, akun demo dari env, completed run dengan kandidat review, serta Playwright/Chrome seperti skrip UI lainnya. Memeriksa setiap kelompok dan alasan pada desktop 1440px serta mobile 390px/320px, dialog/keyboard/scroll, dan kesamaan respons backend sebelum/sesudah. Mutasi selain login diblokir; tidak menjalankan inference. Screenshot dan hasil pemeriksaan tersimpan di `storage/framework/testing/ai-result-review/`.


## Diagnosis antrean analisis

`composer dev` menjalankan web server saja; worker harus dijalankan terpisah. Setelah izin pemakaian saldo AI diberikan, gunakan `php artisan workload:work --allow-paid`. Perintah ini memvalidasi konfigurasi dasar dan menjalankan worker `database`, queue `analysis`, timeout 360, tries 40, sleep 2. Tanpa flag tersebut worker tidak dimulai. Worker lama perlu direstart untuk memuat kode dan pelaporan heartbeat terbaru. Jangan menjalankan worker untuk memeriksa antrean jika inference belum diizinkan.

Diagnosis read-only: `php scripts/diagnose-analysis-queue.php 5`. Output hanya konfigurasi terpilih, keberadaan key/sertifikat (tanpa nilainya), metadata job, progres, ringkasan log, dan hash tabel. Tidak me-reserve job, mengubah run, atau menghubungi provider. Skrip menggunakan konfigurasi database queue yang aktif.

API status menyertakan `queue_health` untuk run milik pengguna. Worker mengirim heartbeat melalui event `JobPopping` hanya untuk koneksi database dan queue analysis. Sinyal berlaku 420 detik agar worker yang sedang menunggu HTTP tidak langsung dianggap hilang. `not_detected` berarti tidak ada sinyal baru, bukan bukti pasti proses OS mati; worker sebelum pembaruan ini juga perlu direstart. Membuka halaman status tidak memulai worker atau inference.

- Job masih menunggu atau reservation kedaluwarsa: worker dapat memproses job yang sama; retry tidak menambah job atau mereset heartbeat/progres.
- Run aktif lebih dari 10 menit tanpa heartbeat dan tanpa job: pemulihan pada run yang sama tersedia. Lock yang sama dengan worker mencegah batch aktif direset. Aktivitas sukses tidak diulang.
- Run gagal/sebagian gagal: retry hanya bagian belum berhasil. Cache, snapshot prompt/model dan hasil sukses tetap digunakan.
- Dua job lama untuk run sama tidak dihapus manual: lock menserialisasi batch, continuation tidak ditambahkan jika ada job lain yang menunggu, dan job untuk run selesai tidak menghubungi AI.

Pengujian: `php artisan test --compact`, `npm --prefix frontend run build`, `npm --prefix frontend run lint`, `node scripts/review-analysis-queue.mjs`. Tes backend menggunakan SQLite in-memory dan HTTP fake; jangan menjalankan beberapa proses PHPUnit bersamaan karena fake storage memakai direktori bersama. Browser memakai respons sintetis dan memblokir akses mutasi nyata; recovery POST hanya dipenuhi oleh fixture. Screenshot/hasil berada di `storage/framework/testing/analysis-queue/`.

Lihat [diagnosis Run 5 dan batas pemulihan](docs/ANALYSIS_QUEUE_DIAGNOSIS.md).

Untuk memeriksa halaman Run 5 aktual sesudah simulasi, tambahkan `--live` pada skrip browser antrean. Mode ini membaca akun demo dari env, mengizinkan POST login saja, dan memblokir seluruh mutasi analisis.


## Batalkan dan lanjutkan Analisis AI

Halaman Analisis AI menyediakan **Batalkan Analisis** untuk run queued/processing. Konfirmasi menjelaskan bahwa hasil sukses tetap tersimpan; request yang sudah diterima untuk dikirim diselesaikan pada titik aman berikutnya dan mungkin tetap memakai saldo API. Status menjadi **Menunggu pembatalan** lalu **Dibatalkan**. Run yang dibatalkan dapat **Lanjutkan Analisis** pada ID dan snapshot asli yang sama, dengan konfirmasi biaya; hanya bagian belum sukses yang diproses. Jangan mulai inference tanpa izin biaya.

Migrasi additive `2026_11_12_000001_add_analysis_cancellation_metadata` diperlukan pada instalasi lain; restart worker setelah kode dan migrasi tersedia. Job lama kompatibel dengan versi 0 dan tidak dihapus manual. Endpoint cancel/resume memakai session/ownership dan `execution_version` untuk menolak aksi stale. Detail state, perlindungan race, dan batas request in-flight: [panduan pembatalan](docs/ANALYSIS_CANCELLATION.md).

Tes browser tanpa inference/mutasi nyata: `node scripts/review-analysis-cancellation.mjs`. Artefak desktop/mobile berada di `storage/framework/testing/analysis-cancellation/`. Jalankan juga tes Laravel, build/lint frontend, serta skrip regresi queue/navigasi yang sudah ada.


## Flutter Android

Client Android Tahap 2 berada di `mobile/`, memakai REST API backend yang sama dengan token Sanctum per perangkat; React tetap session/cookie. Lihat [panduan mobile](mobile/README.md) dan [laporan verifikasi Tahap 2](mobile/PHASE_2_REPORT.md). Migration token additive belum diterapkan pada database aktual; verifikasi backup/target terlebih dahulu. Demo akun nyata masih menunggu kredensial smoke yang cocok dan pengujian HP. Tidak menyalakan worker atau inference berbayar untuk tes.
