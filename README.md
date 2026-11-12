# FTEMation

FTEMation membantu menganalisis beban kerja dan menemukan peluang otomatisasi. Pengguna mengimpor data aktivitas dari Excel, melihat beban kerja dalam satuan FTE, lalu menjalankan analisis AI untuk memperoleh rekomendasi.

FTE (*Full-Time Equivalent*) adalah ukuran beban kerja dibandingkan kapasitas kerja satu orang. Estimasi penghematan dalam aplikasi menunjukkan kapasitas waktu yang berpotensi dihemat, bukan pengurangan jumlah karyawan.

## Fitur utama

- Impor dan pilih dataset Excel.
- Lihat ringkasan beban kerja per aktivitas, karyawan, dan departemen.
- Analisis peluang otomatisasi dengan AI, termasuk prioritas dan kebutuhan pengawasan manusia.
- Pantau riwayat analisis, coba ulang proses yang gagal, serta batalkan atau lanjutkan analisis.
- Unduh hasil analisis yang selesai dalam format Excel, PDF, atau JSON.
- Akses melalui web atau aplikasi Android.

## Teknologi

| Bagian | Teknologi |
| --- | --- |
| Backend dan API | Laravel 13, PHP 8.4, Sanctum |
| Database | MySQL atau MariaDB |
| Web | React, TypeScript, Vite |
| Android | Flutter dan Dart |
| Analisis AI | DeepSeek |
| Pengolahan file | PhpSpreadsheet dan DomPDF |

Laravel menghitung FTE, estimasi penghematan, dan skor prioritas. AI menilai isi aktivitas dan memberikan rekomendasi. Web dan Android menggunakan API yang sama.

## Menjalankan aplikasi secara lokal

### 1. Siapkan kebutuhan

Instal PHP 8.4, Composer, Node.js beserta npm, dan MySQL atau MariaDB. Buat database khusus aplikasi, misalnya `ftemation`.

Ekstensi PHP yang diperlukan: `pdo_mysql`, `fileinfo`, `xml`, `dom`, `simplexml`, `xmlreader`, `xmlwriter`, `zip`, `gd`, `iconv`, `curl`, `openssl`, `mbstring`, dan `bcmath`.

Semua perintah berikut dijalankan dari direktori utama proyek menggunakan PowerShell.

### 2. Instal dependensi dan siapkan konfigurasi

```powershell
composer install
if (-not (Test-Path -LiteralPath .env)) {
    Copy-Item -LiteralPath .env.example -Destination .env
}
npm --prefix frontend ci
```

Buka `.env`, lalu isi pengaturan berikut:

| Pengaturan | Keterangan |
| --- | --- |
| `DB_HOST`, `DB_PORT` | Alamat dan port database |
| `DB_DATABASE` | Nama database yang sudah dibuat |
| `DB_USERNAME`, `DB_PASSWORD` | Akun untuk mengakses database |
| `DEMO_USERNAME`, `DEMO_NAME`, `DEMO_EMAIL`, `DEMO_PASSWORD` | Akun awal yang dibuat oleh seeder; isi password sebelum menjalankan seeder |
| `DEEPSEEK_API_KEY` | Kunci API untuk menjalankan analisis AI |

Pengaturan AI lainnya tersedia di `.env.example`. Kunci API disimpan hanya di backend dan tidak dimasukkan ke kode frontend atau Git.

### 3. Siapkan database

Untuk **instalasi baru**, jalankan:

```powershell
php artisan key:generate
php artisan ftemation:check-database
php artisan migrate
php artisan db:seed
```

Pada instalasi yang sudah digunakan, pertahankan `APP_KEY` yang ada. Periksa koneksi dan cadangkan database sebelum menjalankan migrasi. Seeder tidak mengganti password akun yang sudah ada. Hindari perintah yang menghapus seluruh isi database, seperti `migrate:fresh` atau `db:wipe`.

### 4. Jalankan web

```powershell
npm --prefix frontend run build
composer dev
```

Buka [http://localhost:8000](http://localhost:8000), lalu masuk dengan akun yang diatur melalui `DEMO_USERNAME` dan `DEMO_PASSWORD`.

Saat mengembangkan tampilan React, jalankan perintah berikut di terminal kedua:

```powershell
npm --prefix frontend run dev
```

Buka [http://localhost:5173](http://localhost:5173). Server Vite meneruskan permintaan API ke Laravel. Gunakan hostname `localhost` secara konsisten agar sesi login dan CSRF berfungsi. Hentikan server dengan `Ctrl+C`.

### 5. Jalankan worker untuk analisis AI

Analisis AI membutuhkan `DEEPSEEK_API_KEY` dan worker, yaitu proses yang mengerjakan antrean analisis. Perintah ini mengizinkan penggunaan API berbayar:

```powershell
php artisan workload:work --allow-paid
```

Biarkan terminal worker tetap berjalan selama analisis. Setelah mengubah `.env`, jalankan `php artisan config:clear`, lalu mulai ulang worker. Jika diperlukan sertifikat CA, isi `DEEPSEEK_CA_BUNDLE` dengan lokasi CA bundle tepercaya; jangan menonaktifkan verifikasi TLS.

## Cara menggunakan aplikasi

1. Masuk ke aplikasi.
2. Buka halaman Import Dataset dan unggah file Excel. Contoh tersedia di `samples/FTEMation_Workload_Dataset_v1.xlsx`.
3. Pilih dataset, lalu periksa ringkasan dan Data Aktivitas.
4. Jalankan analisis dari halaman Analisis AI. Pastikan worker aktif dan biaya API telah diizinkan.
5. Buka Hasil Analisis untuk meninjau rekomendasi dan mengunduh laporan setelah proses selesai.

Dataset yang dipilih berlaku untuk seluruh halaman. Ringkasan hasil menggunakan analisis lengkap terbaru, sedangkan status proses dapat menunjukkan analisis terbaru yang masih berjalan. Rekomendasi AI perlu ditinjau bersama pemilik proses sebelum diterapkan.

### Format file Excel

File harus berformat `.xlsx`, berukuran maksimal **5 MB**, dan memiliki tepat satu sheet bernama `Workload`. Gunakan sembilan kolom berikut dalam urutan yang sama:

| Kolom | Isi |
| --- | --- |
| `activity_id` | ID aktivitas, unik dalam satu impor |
| `employee_id` | ID karyawan |
| `employee_name` | Nama karyawan |
| `department` | Nama departemen |
| `activity_name` | Nama aktivitas |
| `description` | Penjelasan aktivitas |
| `frequency` | `daily`, `weekly`, atau `monthly` |
| `volume` | Jumlah pekerjaan per periode, harus positif |
| `duration_minutes` | Durasi per pekerjaan dalam menit, harus positif |

Semua nilai wajib diisi. Identitas karyawan harus konsisten dan sel tidak boleh berisi formula. Kesalahan impor ditampilkan per baris. Template tersedia melalui endpoint terautentikasi `/api/import-template`.

Dataset contoh berisi 60 aktivitas, 12 karyawan, dan 3 departemen. Workbook evaluasi terpisah merupakan rubrik studi kasus dan tidak dikirim sebagai jawaban ke model AI.

## Dasar perhitungan

```text
Menit kerja tahunan = volume * duration_minutes * faktor tahunan
FTE = menit kerja tahunan / 115200
Estimasi penghematan FTE = FTE * saving_rate
```

| Frekuensi | Faktor tahunan |
| --- | ---: |
| daily | 240 |
| weekly | 48 |
| monthly | 12 |

| Peluang otomatisasi | saving_rate |
| --- | ---: |
| high | 0.6 |
| medium | 0.3 |
| low | 0.1 |

Skor prioritas memperhitungkan estimasi penghematan, risiko, dan usaha implementasi:

```text
priority = 100 * (saving / maxSavingRun) * riskFactor * effortFactor
riskFactor untuk low / medium / high = 1 / 0.7 / 0.4
effortFactor untuk low / medium / high = 1 / 0.75 / 0.5
```

`maxSavingRun` adalah penghematan terbesar dalam satu analisis. Skor bernilai nol jika nilai tersebut nol. Total dataset contoh adalah 4.4671875 FTE. Tampilan memakai empat angka desimal dan ekspor enam angka desimal.

Setiap analisis menyimpan salinan pengaturan perhitungannya. Perubahan konfigurasi tidak mengubah hasil historis. FTE di atas satu perlu diperiksa kembali berdasarkan periode, volume, durasi, dan pembagian pekerjaan.

## Jika analisis belum berjalan

- Pastikan worker aktif dan mendengarkan koneksi `database` pada antrean `analysis`.
- Status menunggu worker berarti belum ada sinyal worker terbaru; status tersebut tidak selalu berarti prosesnya mati.
- Jika pekerjaan sudah ada dalam antrean, tidak perlu memulai analisis baru. Tombol coba ulang juga tidak menyalakan worker.
- Proses yang tidak bergerak selama 10 menit dapat dipulihkan melalui UI ketika opsi pemulihan tersedia. Jangan menghapus job atau mengubah progres secara manual.
- Pembatalan menunggu permintaan AI yang sedang berlangsung selesai sehingga masih dapat menimbulkan biaya. Melanjutkan analisis hanya memproses bagian yang belum berhasil.

Untuk pengelola: heartbeat worker berlaku 420 detik. Pertahankan urutan timeout job (360 detik) < mutex (400 detik) < `DB_QUEUE_RETRY_AFTER` (420 detik). Linux dengan PCNTL dianjurkan untuk penghentian paksa saat timeout; Windows tidak menjamin penghentian proses tepat pada batas waktu. Permintaan AI dapat terulang jika proses mati sebelum hasil tersimpan.

## Struktur proyek

| Direktori | Isi |
| --- | --- |
| `app/Http/`, `routes/` | API, autentikasi, dan validasi permintaan |
| `app/Services/Workload/` | Impor Excel dan perhitungan FTE |
| `app/Services/Analysis/`, `app/Jobs/` | Analisis AI, antrean, cache, dan ekspor |
| `database/` | Migrasi, seeder, dan kategori aktivitas |
| `frontend/src/` | Tampilan web React |
| `mobile/` | Aplikasi Android Flutter |
| `resources/prompts/` | Prompt AI beserta versinya |
| `resources/views/reports/` | Template laporan PDF |
| `samples/` | Dataset contoh dan rubrik evaluasi |
| `docs/` | Dokumentasi teknis dan studi kasus |
| `storage/` | File privat, cache, sesi, dan log |

Panduan instalasi dan build Android tersedia di [README mobile](mobile/README.md). Web menggunakan sesi dan cookie Sanctum dengan CSRF, sedangkan Android menggunakan token per perangkat yang disimpan di secure storage.

## Catatan pemeliharaan

- Perhitungan FTE dan penghematan tetap dilakukan di Laravel. AI tidak menjadi sumber angka perhitungan tersebut.
- Analisis baru memakai prompt `activity-v2` dan `summary-v2`. Percobaan ulang dan proses lanjutan memakai konfigurasi asli. Cache dipisahkan per pemilik data.
- Backend memvalidasi struktur hasil AI, kategori, ID, pengelompokan, dan pengawasan manusia. Hasil yang lolos validasi tetap membutuhkan tinjauan manusia; kontrol manusia wajib untuk keputusan berisiko atau yang membutuhkan penilaian tinggi.
- Pembatalan dan pelanjutan mempertahankan hasil yang berhasil. Endpoint `/api/analyses/{run}/cancel` dan `/resume` membutuhkan `execution_version` terbaru; versi atau status yang sudah berubah menghasilkan respons `409`.
- Ekspor tersedia hanya jika seluruh aktivitas dan kesimpulan berhasil. File disimpan secara privat di `storage/app/private/exports/run-<id>/`.

Perintah analisis dan ekspor melalui terminal:

```powershell
php artisan workload:analyze <import-id>
php artisan workload:export <completed-run-id>
```

Perintah `workload:analyze` mengantrekan pekerjaan yang menggunakan API berbayar.

Sebelum deployment, gunakan HTTPS, arahkan document root ke `public/`, atur `APP_ENV=production`, `APP_DEBUG=false`, dan `SESSION_SECURE_COOKIE=true`. Sesuaikan domain Sanctum serta trusted proxy, pertahankan CSRF, dan ganti password demo. Simpan secret hanya di backend.

Kelola worker dengan process manager dan mulai ulang setelah deployment. Pastikan direktori storage/cache dapat ditulis, serta siapkan pemantauan failed jobs, kapasitas disk, rotasi log, dan backup. Build lokal saja belum membuktikan kesiapan production.

Paket source ini tidak menyertakan suite pengujian atau skrip QA. Untuk memeriksa frontend, gunakan `npm --prefix frontend run lint` dan `npm --prefix frontend run build`. Perubahan autentikasi, akses data, antrean, dan perhitungan memerlukan verifikasi regresi sebelum deployment.

## Dokumentasi lanjutan

- [Panduan dataset](docs/DATASET_GUIDE.md)
- [Diagram database](docs/ERD_v1.mmd)
- [Kebutuhan aplikasi / PRD](docs/PRD_v1.1.md)
- [Keputusan teknologi](docs/TECH_STACK_DECISIONS_v1.1.md)
- [Dokumen studi kasus](<docs/references/Studi Kasus AI Insight.pdf>)

PRD dan ERD awal menjadi referensi studi kasus. Migrasi dan kode aktif juga mencakup pengembangan lifecycle analisis dan aplikasi mobile.
