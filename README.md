# FTEMation

FTEMation adalah aplikasi analisis beban kerja yang dibuat untuk studi kasus **AI Insight untuk Workload Assessment Analysis**. Aplikasi ini membantu HR dan pemilik proses memahami beban kerja, menilai peluang otomatisasi, serta menentukan aktivitas yang layak diprioritaskan.

Data aktivitas diimpor dari Excel, lalu dihitung dalam satuan **FTE (Full-Time Equivalent)**, yaitu beban kerja dibandingkan kapasitas kerja satu orang. DeepSeek memberikan penilaian dan rekomendasi; Laravel menghitung FTE, estimasi penghematan, dan skor prioritas.

## Akses aplikasi

| Keperluan | Tautan |
| --- | --- |
| Website production | [ftemation.chfitra.my.id](https://ftemation.chfitra.my.id) |
| Source code | [github.com/ch-fitra/FTEMation](https://github.com/ch-fitra/FTEMation) |
| Dataset contoh | [FTEMation_Workload_Dataset_v1.xlsx](samples/FTEMation_Workload_Dataset_v1.xlsx) |
| Diagram database | [ERD dalam format gambar](docs/ERD_v1.png) |

### Akun demo

| | Kredensial |
| --- | --- |
| Username bawaan seeder | `akun demo` |
| Password | **[Diisi pengelola dengan password akun demo khusus penguji]** |

Password demo tidak disertakan dalam source code. Untuk instalasi lokal, isi `DEMO_PASSWORD` minimal delapan karakter sebelum menjalankan seeder, lalu masuk dengan username dan password yang Anda tetapkan. Username di atas merupakan nilai bawaan `.env.example`, belum merupakan konfirmasi akun pada website production. Pengelola perlu melengkapi kredensial demo sebelum menyerahkan akses kepada penguji.

## Fitur dan alur penggunaan

1. **Login** dengan akun yang disediakan.
2. **Import Dataset**: unggah Excel, periksa pesan validasi, lalu pilih dataset yang akan digunakan.
3. **Overview dan Data Aktivitas**: tinjau total FTE, perbandingan departemen, serta detail aktivitas. Pencarian dan filter membantu menelusuri data sebelum dianalisis.
4. **Analisis AI**: jalankan penilaian otomatisasi dan pantau progres. Riwayat analisis tersedia, termasuk opsi mencoba ulang bagian gagal, membatalkan, dan melanjutkan proses.
5. **Hasil Analisis**: baca level otomatisasi, alasan, rekomendasi, prioritas, serta kesimpulan per karyawan dan departemen. Dashboard menampilkan estimasi penghematan setelah analisis lengkap tersedia.
6. **Grouping**: tinjau aktivitas dengan mekanisme kerja serupa lintas karyawan dan departemen, beserta total FTE dan estimasi penghematannya.
7. **Export**: unduh laporan PDF, Excel, atau `results.json` setelah seluruh aktivitas dan kesimpulan berhasil diproses.

Pilihan dataset berlaku di seluruh halaman. Ringkasan hasil menggunakan analisis lengkap terbaru; status proses dapat menunjukkan analisis terbaru yang masih berjalan. Estimasi penghematan adalah potensi kapasitas waktu, bukan efisiensi yang sudah terbukti atau dasar otomatis pengurangan karyawan.

## Teknologi dan arsitektur

| Bagian | Teknologi dan peran |
| --- | --- |
| Backend | Laravel 13, PHP 8.4, REST API, autentikasi Sanctum |
| Web | React, TypeScript, Vite, Axios |
| Android | Flutter, Dart, Provider, Dio |
| Database | MySQL atau MariaDB; antrean dan cache menggunakan database |
| AI | DeepSeek melalui API backend |
| Impor dan laporan | PhpSpreadsheet untuk Excel, DomPDF untuk PDF |

```text
React (web) --------+
                   +--> Laravel API --> Database
Flutter (Android) -+         |
                             +--> Antrean --> Worker --> DeepSeek
                             +--> Perhitungan FTE dan laporan
```

Web menggunakan sesi/cookie dengan CSRF. Android menggunakan Bearer token Sanctum yang disimpan melalui secure storage. Kedua aplikasi membaca data dan hasil perhitungan dari Laravel; API key DeepSeek hanya berada di backend.

## Instalasi dan konfigurasi lokal

### 1. Siapkan perangkat dan dependensi

Diperlukan PHP 8.4, Composer, Node.js/npm yang kompatibel dengan dependensi Vite, serta MySQL atau MariaDB. Ekstensi PHP: `pdo_mysql`, `fileinfo`, `xml`, `dom`, `simplexml`, `xmlreader`, `xmlwriter`, `zip`, `gd`, `iconv`, `curl`, `openssl`, `mbstring`, dan `bcmath`.

Buat database bernama **`ftemation`**. Nama ini diperlukan oleh perintah `ftemation:check-database`. Jalankan perintah berikut dari direktori utama proyek menggunakan PowerShell:

```powershell
composer install
if (-not (Test-Path -LiteralPath .env)) {
    Copy-Item -LiteralPath .env.example -Destination .env
}
npm --prefix frontend ci
```

### 2. Isi `.env`

Sesuaikan nilai berikut dengan lingkungan lokal. Teks dalam tanda `<...>` harus diganti, bukan digunakan sebagai kredensial.

```dotenv
APP_URL=http://localhost:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ftemation
DB_USERNAME=<username_database>
DB_PASSWORD=<password_database>

DEMO_NAME=Demo
DEMO_USERNAME="akun demo"
DEMO_EMAIL=demo@ftemation.local
DEMO_PASSWORD=<password_demo_minimal_8_karakter>

QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=database
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:8000,localhost

DEEPSEEK_API_KEY=<api_key_deepseek>
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-flash
DEEPSEEK_TIMEOUT=90
DEEPSEEK_CA_BUNDLE=
```

`deepseek-flash` adalah model default dalam kode. Model dapat diubah melalui `DEEPSEEK_MODEL`, mengikuti model yang tersedia untuk akun provider. Jangan memasukkan `.env`, password, atau API key ke Git maupun variabel frontend `VITE_`.

### 3. Siapkan database aplikasi

Untuk **instalasi baru**:

```powershell
php artisan key:generate
php artisan ftemation:check-database
php artisan migrate
php artisan db:seed
```

Seeder membuat akun demo dan mengisi 20 kategori grouping. Jika akun dengan email yang sama sudah ada, passwordnya tidak diganti. Pada instalasi yang sudah digunakan, pertahankan `APP_KEY`, periksa koneksi, dan cadangkan database sebelum migrasi. Jangan gunakan `migrate:fresh` atau `db:wipe` pada database berisi data pengguna.

### 4. Jalankan website

```powershell
npm --prefix frontend run build
composer dev
```

Buka [http://localhost:8000](http://localhost:8000). Laravel menyajikan hasil build React dari `public/build/`.

Untuk mengembangkan frontend, biarkan Laravel berjalan lalu buka terminal kedua:

```powershell
npm --prefix frontend run dev
```

Akses [http://localhost:5173](http://localhost:5173). Vite meneruskan `/api` dan `/sanctum` ke Laravel. Gunakan hostname `localhost` secara konsisten agar cookie login bekerja.

### 5. Jalankan worker AI

Di terminal terpisah, jalankan:

```powershell
php artisan workload:work --allow-paid
```

Worker mengerjakan antrean `analysis` melalui koneksi `database`. Opsi `--allow-paid` mengizinkan pemakaian API berbayar, sehingga API key dan saldo provider harus tersedia. Membuka halaman analisis saja tidak menyalakan worker.

Setelah mengubah `.env`, jalankan `php artisan config:clear` dan mulai ulang worker. Bila PHP membutuhkan CA bundle, isi `DEEPSEEK_CA_BUNDLE` dengan path sertifikat tepercaya; jangan mematikan verifikasi TLS. Hentikan proses lokal dengan `Ctrl+C` pada masing-masing terminal.

## Dataset Excel

[Dataset contoh](samples/FTEMation_Workload_Dataset_v1.xlsx) berisi **60 aktivitas, 12 karyawan, dan 3 departemen**: Finance & Accounting, Human Resources, dan Operations. Jumlah ini memenuhi minimum studi kasus, yaitu 50 aktivitas, 10 karyawan, dan 3 departemen. Aktivitas administratif serupa tersedia untuk meninjau grouping lintas unit.

Workbook harus berupa `.xlsx`, maksimal **5 MB**, dengan tepat satu sheet bernama **`Workload`**. Baris pertama wajib memuat sembilan kolom berikut dalam urutan yang sama:

| Kolom | Isi / contoh dari dataset |
| --- | --- |
| `activity_id` | ID aktivitas unik, misalnya `ACT-0001` |
| `employee_id` | ID karyawan, misalnya `FIN-001` |
| `employee_name` | Nama karyawan, misalnya `Nabila Putri` |
| `department` | Departemen, misalnya `Finance & Accounting` |
| `activity_name` | Nama pekerjaan, misalnya `Input invoice pemasok` |
| `description` | Penjelasan langkah, input, dan batasan pekerjaan |
| `frequency` | `daily`, `weekly`, atau `monthly` |
| `volume` | Jumlah pekerjaan per periode, misalnya `10` |
| `duration_minutes` | Menit per pekerjaan, misalnya `9` |

Pada contoh tersebut, petugas membaca invoice PDF dari email vendor, memasukkan field ke modul Accounts Payable pada ERP, lalu menandai dokumen yang tidak lengkap untuk ditindaklanjuti. Deskripsi yang jelas membantu AI membedakan proses rutin dari keputusan yang memerlukan manusia.

Semua kolom wajib diisi, volume/durasi harus positif, dan identitas karyawan harus konsisten. Formula Excel ditolak; kesalahan dilaporkan per baris. Batas pembaca adalah 10.000 baris data dan 50 MB isi setelah dekompresi. Dataset di bawah minimum studi kasus tetap dapat diimpor dengan peringatan.

[Workbook evaluasi](samples/FTEMation_AI_Evaluation_v1.xlsx) adalah rubrik peninjauan, bukan file untuk diimpor atau jawaban yang dikirim kepada AI. Penjelasan tambahan tersedia di [panduan dataset](docs/DATASET_GUIDE.md).

## Pendekatan analisis AI

### Model, prompt, dan klasifikasi

Backend mengirim aktivitas ke DeepSeek dalam batch berisi lima aktivitas, menggunakan JSON mode, `temperature=0`, dan thinking dinonaktifkan. Prompt disimpan terpisah:

- [`activity-v2.txt`](resources/prompts/activity-v2.txt): penilaian aktivitas, alasan, rekomendasi, kategori, risiko, usaha implementasi, dan pengawasan manusia.
- [`summary-v2.txt`](resources/prompts/summary-v2.txt): kesimpulan per karyawan dan departemen berdasarkan hasil serta urutan prioritas yang sudah dihitung Laravel.

| Level | Kriteria |
| --- | --- |
| **High** | Mayoritas langkah dapat diotomasi: berulang, aturan jelas, dan input terstruktur. |
| **Medium** | Sebagian langkah dapat diotomasi, tetapi pengecualian atau peninjauan manusia masih signifikan. |
| **Low** | AI membantu pekerjaan; inti aktivitas membutuhkan negosiasi, interpretasi, persetujuan, atau keputusan manusia. |

Penilaian mempertimbangkan repetisi, kejelasan aturan, struktur data, kebutuhan penilaian manusia, dan risiko operasional. Prompt meminta rekomendasi berdasarkan fakta input serta menyebutkan prasyarat yang belum dikonfirmasi.

### Validasi dan konsistensi

Laravel memeriksa struktur JSON, kelengkapan dan keunikan ID, nilai kategori, alasan/rekomendasi, serta kesesuaian level dengan cakupan otomatisasi. Kesimpulan wajib mencakup setiap karyawan dan departemen; narasinya tidak boleh menambahkan angka, karena angka disediakan aplikasi.

Grouping memakai 20 kategori tetap dari [`group_taxonomy.json`](database/data/group_taxonomy.json). Aktivitas dengan mekanisme serupa dinilai menggunakan rubrik yang sama. Grup yang memiliki level berbeda ditandai sebagai kandidat review. Perbedaan dapat valid karena risiko atau kebutuhan keputusan manusia; penanda tersebut bukan bukti bahwa AI salah.

### Kegagalan, retry, dan cache

Permintaan yang gagal sementara, timeout, atau menghasilkan keluaran tidak valid dicoba hingga tiga kali dengan jeda bertahap. Masalah akses, saldo, atau konfigurasi perlu diperbaiki sebelum mencoba ulang. UI menyediakan retry untuk proses gagal serta cancel/resume; hasil yang sudah berhasil dipertahankan.

Cache berlaku 30 hari dan dipisahkan per pemilik. Kunci cache memperhitungkan input, provider/model, prompt, dan kategori. Data yang sama dapat memakai hasil tersimpan selama cache valid. Setiap analisis menyimpan konfigurasi dan prompt aslinya agar retry, resume, serta riwayat tetap memakai dasar yang sama.

### Pengawasan manusia

Risiko atau kebutuhan penilaian manusia yang tinggi mewajibkan pengawasan. Aktivitas dengan keputusan berdampak tinggi wajib berlevel Low, dengan keputusan final di tangan manusia. Label `human_oversight_required=false` tetap dapat mencakup review pengecualian; baca juga `oversight_note`. JSON yang valid tidak menjamin rekomendasi benar atau siap diterapkan.

## Perhitungan FTE, penghematan, dan prioritas

Nilai bawaan berada di [`config/ftemation.php`](config/ftemation.php), dengan perhitungan di [`FteCalculator.php`](app/Services/Workload/FteCalculator.php).

```text
menit_tahunan = volume * duration_minutes * faktor_tahunan
FTE = menit_tahunan / 115200
estimasi_saving_FTE = FTE * saving_rate
```

Faktor tahunan adalah **240** untuk daily, **48** untuk weekly, dan **12** untuk monthly. Kapasitas 115.200 menit setara dengan 1.920 jam kerja efektif per tahun. Contoh `ACT-0001`: `10 * 9 * 240 / 115200 = 0,1875 FTE`. Total dataset contoh adalah **4,4671875 FTE** berdasarkan asumsi tersebut.

| Level | Asumsi kapasitas waktu yang dapat dihemat |
| --- | ---: |
| High | 60% dari FTE aktivitas |
| Medium | 30% dari FTE aktivitas |
| Low | 10% dari FTE aktivitas |

Persentase ini adalah asumsi aplikasi, bukan hasil pengukuran implementasi. Low tetap memiliki estimasi kecil karena bantuan sistem dapat menghemat sebagian pekerjaan pendukung.

```text
priority = 100 * (saving / maxSavingRun) * riskFactor * effortFactor
```

`maxSavingRun` adalah saving terbesar dalam satu analisis. Skor nol jika nilainya nol. Faktor risiko Low/Medium/High adalah **1 / 0,7 / 0,4**, sedangkan faktor usaha implementasi adalah **1 / 0,75 / 0,5**. Skor lebih tinggi mendahulukan potensi penghematan besar dengan risiko dan usaha yang lebih rendah.

Perhitungan memakai salinan konfigurasi pada masing-masing analisis; perubahan konfigurasi tidak menghitung ulang riwayat. Tampilan memakai empat angka desimal dan ekspor enam angka desimal. FTE di atas satu perlu ditinjau berdasarkan periode, volume, durasi, dan pembagian kerja.

## Menjalankan Flutter Android

Siapkan Flutter dengan Dart yang memenuhi `^3.13.3`, Android SDK, dan JDK 17. Backend Laravel serta worker tetap dijalankan sesuai panduan di atas. Dari direktori utama:

```powershell
cd mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

`10.0.2.2` menghubungkan emulator Android ke backend lokal komputer. `API_BASE_URL` berisi alamat dasar server, tanpa tambahan `/api`. Untuk HP melalui USB, ganti `DEVICE_ID` dengan ID dari `adb devices`, lalu jalankan dari `mobile/`:

```powershell
adb -s DEVICE_ID reverse tcp:8000 tcp:8000
flutter run -d DEVICE_ID --dart-define=API_BASE_URL=http://127.0.0.1:8000
```

Build APK debug untuk emulator:

```powershell
flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

APK berada di `mobile/build/app/outputs/flutter-apk/`. Android memakai API Laravel untuk login, impor, dashboard, analisis, dan ekspor. Token perangkat disimpan melalui `flutter_secure_storage`; FTE dan analisis tidak dihitung ulang di Flutter.

HTTP hanya diizinkan dalam debug. Release membutuhkan HTTPS dan signing sendiri; konfigurasi saat ini masih memakai debug signing. Panduan API, build, dan kendala perangkat ada di [README mobile](mobile/README.md).

## Struktur proyek dan database

| Lokasi | Isi |
| --- | --- |
| `app/Http/`, `routes/` | API, autentikasi, dan validasi permintaan |
| `app/Services/Workload/` | Pembacaan Excel, impor, dan perhitungan FTE |
| `app/Services/Analysis/`, `app/Jobs/` | Integrasi AI, validasi, antrean, cache, dan ekspor |
| `config/ftemation.php` | Asumsi perhitungan dan pengaturan AI |
| `database/migrations/`, `database/seeders/` | Skema database, akun awal, dan kategori grouping |
| `frontend/src/` | Halaman dan komponen React |
| `mobile/lib/` | Aplikasi Flutter dan integrasi API |
| `resources/prompts/`, `resources/views/reports/` | Prompt AI dan template PDF |
| `samples/`, `docs/` | Dataset, rubrik evaluasi, ERD, dan dokumen studi kasus |
| `storage/` | Upload/ekspor privat, cache, sesi, dan log |

Tujuh tabel domain utama adalah `users`, `imports`, `employees`, `activities`, `analysis_runs`, `activity_groups`, dan `activity_analyses`. Satu impor memiliki karyawan, aktivitas, dan riwayat analisis. Setiap hasil menghubungkan aktivitas, analisis, serta kategori grouping. Tabel antrean, cache, sesi, dan token Sanctum mendukung operasional aplikasi.

Lihat [ERD gambar](docs/ERD_v1.png) atau [sumber Mermaid](docs/ERD_v1.mmd). ERD awal menjelaskan relasi utama; migrasi menjadi acuan untuk kolom tambahan seperti username, metadata eksekusi, pembatalan, dan token mobile.

## Ekspor dan kelengkapan studi kasus

`results.json` dihasilkan aplikasi dari analisis lengkap, bukan ditulis manual. Bagian `activities` memuat ID unik sesuai dataset, level otomatisasi, alasan, rekomendasi, `group_id`, FTE, estimasi saving, dan status. Laporan juga menyertakan ringkasan serta metadata perhitungan. FTE dan saving berasal dari Laravel.

Ekspor melalui terminal juga tersedia dari direktori utama:

```powershell
php artisan workload:analyze <import-id>
php artisan workload:export <completed-run-id>
```

Ganti placeholder dengan ID sebenarnya. `workload:analyze` mengantrekan analisis berbayar; ekspor menulis JSON/Excel/PDF ke `storage/app/private/exports/run-<id>/`.

Untuk penyerahan sesuai [dokumen studi kasus](<docs/references/Studi Kasus AI Insight.pdf>), siapkan source code beserta README dan kredensial demo, dataset Excel, ERD gambar/PDF, video bersuara berdurasi 8-10 menit, serta `results.json` untuk seluruh aktivitas. Seluruh berkas diminta berada dalam satu folder Google Drive dengan akses **Anyone with the link - Viewer**. README ini tidak menyatakan video, hasil analisis final, atau folder penyerahan sudah tersedia.

## Keterbatasan dan catatan operasional

- Kualitas rekomendasi bergantung pada deskripsi aktivitas dan respons AI. Cache serta rubrik membantu konsistensi, tetapi tidak menjamin penilaian identik atau bebas kesalahan.
- Data aktivitas adalah cuplikan pekerjaan, bukan penilaian produktivitas individu. Saving perlu divalidasi melalui uji implementasi bersama pemilik proses.
- Analisis membutuhkan koneksi provider, saldo API, dan worker aktif. Bila antrean tidak bergerak, periksa worker sebelum membuat analisis baru. Pemulihan tersedia di UI untuk proses yang memenuhi syarat setelah tidak bergerak selama 10 menit.
- Cancel menunggu permintaan yang sedang berjalan selesai dan masih dapat menimbulkan biaya. Permintaan dapat terulang jika worker berhenti sebelum respons tersimpan; eksekusi tepat satu kali tidak dijamin.
- Timeout job 360 detik, mutex 400 detik, dan `DB_QUEUE_RETRY_AFTER` default 420 detik. Pertahankan urutan tersebut. Linux/PCNTL diperlukan untuk hard timeout proses; Windows memiliki keterbatasan penghentian paksa.
- APK belum siap distribusi release sebelum signing dan verifikasi perangkat. Keberadaan website production tidak membuktikan seluruh alur web/Android atau akurasi AI sudah diuji.

Untuk deployment, gunakan HTTPS, document root `public/`, `APP_ENV=production`, `APP_DEBUG=false`, dan `SESSION_SECURE_COOKIE=true`. Sesuaikan domain Sanctum/trusted proxy, pertahankan CSRF, kelola worker dengan process manager, serta siapkan backup dan pemantauan log/failed jobs. File unggahan dan ekspor tetap privat, dengan akses berdasarkan pemilik data.

Pemeriksaan frontend yang tersedia adalah `npm --prefix frontend run lint` dan `npm --prefix frontend run build`. README ini menjelaskan implementasi dan cara menjalankan, bukan laporan hasil pengujian.

Referensi tambahan: [PRD](docs/PRD_v1.1.md) dan [keputusan teknologi](docs/TECH_STACK_DECISIONS_v1.1.md).
