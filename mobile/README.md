# FTEMation Mobile

Flutter Android client untuk REST API Laravel yang sama dengan React. Data workload, perhitungan FTE, saving, klasifikasi AI, dan export berasal dari backend. Tidak ada fallback demo ketika jaringan gagal. Fixture ada untuk pengujian terisolasi; aplikasi normal selalu memerlukan login.

Status verifikasi Tahap 2: **implementasi selesai, migration Sanctum telah diterapkan dan login nyata Android berhasil**, sesuai konfirmasi hasil terbaru pengguna. Audit akhir sebelumnya menemukan nol akun plaintext setelah tindakan pemilik. Verifikasi web melalui computer-use belum tersedia sebagai bukti akhir; tidak dicoba ulang pada finalisasi. Belum production-ready. Lihat [laporan Tahap 2](PHASE_2_REPORT.md).

## Prasyarat dan menjalankan

Toolchain terverifikasi: Flutter 3.47.4 / Dart 3.13.3, Laravel 13, PHP 8.4, Android SDK dan JDK dari Android Studio. Jangan membuat ulang proyek Flutter, menimpa `.env`, menjalankan seeder/reset DB, atau menyalakan worker untuk pengujian ini.

Backend dari root repository:

```powershell
composer install
php artisan ftemation:check-database
php artisan migrate:status
npm --prefix frontend ci
npm --prefix frontend run build
composer dev
```

`composer dev` hanya menjalankan web server localhost:8000. React menggunakan session/cookie Sanctum dan CSRF. Endpoint mobile menggunakan token Bearer terpisah. Baca README utama untuk instalasi database baru.

Migration `2026_11_12_000002_create_personal_access_tokens_table.php` hanya membuat tabel infrastruktur Sanctum dan **sudah diterapkan pada database aktual**. Tidak perlu dijalankan ulang untuk finalisasi. Untuk instalasi lain yang belum memiliki tabel token, verifikasi target koneksi/schema, backup yang dapat dipulihkan, dan tidak ada tabel token duplikat sebelum memakai perintah berikut:

```powershell
php artisan migrate --path=database/migrations/2026_11_12_000002_create_personal_access_tokens_table.php
```

Jangan reset password akun lokal. Pemilik akun legacy perlu login web dengan kredensial sah untuk upgrade hash existing, atau menjalankan rotasi terkontrol yang disetujui. Login mobile menolak akun yang masih plaintext dengan pesan kegagalan generik. Tidak ada akun baru yang dibuat otomatis.

Android emulator:

```powershell
cd mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

HP USB (setelah `adb devices` menampilkan fb0caebb sebagai device):

```powershell
adb -s fb0caebb reverse tcp:8000 tcp:8000
flutter run -d fb0caebb --dart-define=API_BASE_URL=http://127.0.0.1:8000
```

ADB reverse membuat backend localhost dapat diakses tanpa membuka firewall LAN. Untuk LAN, jalankan Laravel pada alamat interface development yang sesuai dan batasi aturan firewall pada jaringan privat/port yang diperlukan; jangan menonaktifkan firewall global. Ganti URL melalui `--dart-define`, tidak melalui source code.

```powershell
flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:8000
flutter build apk --release --dart-define=API_BASE_URL=https://backend.example.invalid
```

URL contoh release wajib diganti. Release menolak HTTP di client dan Android manifest; HTTP hanya diizinkan debug. Build tanpa API_BASE_URL tetap dapat membuka login, tetapi request menampilkan pesan konfigurasi, bukan data palsu. Signing release masih konfigurasi debug existing; siapkan keystore milik pemilik sebelum distribusi. Application ID tetap `com.tancorp.ftemation_mobile`; pastikan izin penggunaan namespace organisasi. Jika tidak mendapat izin, rencanakan ID milik pemilik proyek, misalnya `id.<domainpemilik>.ftemation`, sebelum publikasi. Mengubah ID memengaruhi identitas instalasi dan data secure storage.

## Kontrak autentikasi

| Endpoint | Kontrak |
|---|---|
| POST /api/mobile/login | JSON username, password, device_name (string maks. 100); password maks. 255. Sukses 200: user, token, token_type=Bearer, expires_at; Cache-Control no-store. |
| GET /api/user | Authorization: Bearer token; respons user tanpa password/remember_token. |
| POST /api/mobile/logout | Bearer token aktif; mencabut token tersebut saja. Session web dan perangkat lain tetap berlaku. Cookie-only ditolak 403. |

Login salah/akun tidak ditemukan/akun plaintext: 422 dengan pesan sama. Rate limit login 5/menit per username/IP, bersama limiter web existing. Deployment selain local/testing wajib HTTPS. `MOBILE_TOKEN_HOURS=24` di backend, dibatasi 1..168 jam saat issuance. Token hashed di tabel Sanctum, memiliki kemampuan `workload:access`, dan tetap tunduk pada ownership dataset/run. Token tidak pernah ditempatkan di URL/log. Token disimpan melalui flutter_secure_storage, password tidak disimpan, backup Android dinonaktifkan. Saat startup, token divalidasi melalui profil; 401 membersihkan sesi dan workspace. Logout offline menampilkan error dan dapat dicoba ulang agar pencabutan server tidak diklaim berhasil.

## Fitur dan endpoint

- GET /api/imports: pagination dataset, pilihan aktif bersama seluruh halaman.
- GET /api/imports/{id}: KPI, departemen, peluang dan status dari snapshot Laravel.
- GET /api/imports/{id}/activities: search, department, frequency, page, per_page=20, detail input/FTE.
- GET /api/imports/{id}/analyses dan /api/analyses/{run}: riwayat, metadata, progress, hasil, ringkasan karyawan/departemen.
- POST /api/imports/{id}/analyses; POST /api/analyses/{run}/retry|cancel|resume: konfirmasi biaya/tindakan; cancel/resume membawa execution_version server.
- POST /api/imports: multipart file .xlsx maksimal 5 MB, konfirmasi, upload progress dan error per baris Laravel. Android content URI dibaca melalui file picker; tidak memerlukan akses storage menyeluruh atau parser Excel perangkat.
- GET /api/analyses/{run}/export/json|xlsx|pdf: hanya completed report; MIME diverifikasi, nama dari header server, simpan melalui pemilih lokasi native Android. Open/share langsung belum ditambahkan; gunakan aplikasi Files setelah penyimpanan.

Polling hanya pada halaman Analisis dan status queued/processing/cancel_requested, berhenti saat halaman ditutup/aplikasi background, tidak overlap, dan dapat dipulihkan melalui refresh. Pergantian dataset membatalkan/menolak respons lama. Mutasi tidak di-retry otomatis. Hasil noncompleted tidak disajikan sebagai report final. Hasil run lengkap saat ini dibaca sebagai satu report sesuai API existing; daftar input tetap paginated.

## Struktur

```text
lib/
  app.dart, main.dart
  core/api/              Dio, cancellation, error mapping, HTTPS config
  core/storage/          secure token storage
  core/theme/, widgets/  tema dan panel/brand bersama
  core/demo/             fixture Tahap 1 yang tidak diimpor aplikasi normal
  navigation/            router dengan session guard, shell lima tab
  features/auth/         form login dan SessionState
  features/datasets/     repository API, WorkspaceState, dataset/upload UI
  features/overview/     KPI/departemen dari summary Laravel
  features/activities/   pagination/filter/detail
  features/analysis/     RunState, lifecycle dan polling
  features/results/      pemilihan run, detail hasil, export native
  features/help/         panduan interpretasi
```

Alur UI -> ChangeNotifier/Provider -> repository -> Dio -> Laravel. Tidak ada database kedua atau perhitungan ulang FTE/AI di Flutter. Dependency langsung tambahan: Dio untuk HTTP, flutter_secure_storage untuk token, file_picker untuk pilih/simpan file native. Versi dikunci pubspec.lock. API package diperiksa terhadap dokumentasi dan source package terpasang; file_picker 13 menggunakan List<PlatformFile>, length(), readAsBytes(), dan saveFile(bytes, mimeType).

## Pengujian tanpa inference

Dari root:

```powershell
php artisan test --compact --no-ansi
php vendor/bin/pint --test
npm --prefix frontend run build
npm --prefix frontend run lint
php scripts/pre-flutter-integrity.php
php scripts/verify-analysis-history.php
```

Dari mobile:

```powershell
dart format .
flutter analyze
flutter test
flutter build apk --debug
flutter drive --driver=test_driver/integration_test.dart --target=integration_test/device_test.dart -d fb0caebb
```

Unit/widget menggunakan Dio HttpClientAdapter fake dan MemoryTokens di test/support; tidak mengakses server/database pengguna/provider. Integration test perangkat memakai fixture API terisolasi serta secure storage Android pada key pengujian terpisah, dan bukan bukti login akun nyata. Tambahkan --dart-define=CHECK_LOCAL_BACKEND=true --dart-define=API_BASE_URL=http://127.0.0.1:8000 setelah adb reverse untuk memeriksa GET /api/user guest=401 melalui jaringan USB; tidak ada mutasi backend aktual. Tidak menjalankan worker operasional atau endpoint inference nyata. Untuk pemeriksaan web berikutnya, smoke web dapat memakai SMOKE_USERNAME/SMOKE_PASSWORD pada env backend (tidak dicetak), tanpa --import agar tidak menambah dataset historis. Jangan menaruh kredensial dalam argumen build Flutter.

Screenshot renderer tes (bukan HP), opsional di Windows:

```powershell
flutter test test/visual_review_test.dart --update-goldens --dart-define=CAPTURE_REVIEW=true --dart-define=REVIEW_FONT=C:/Windows/Fonts/segoeui.ttf --dart-define=REVIEW_ICON_FONT=D:/app/flutter/bin/cache/artifacts/material_fonts/materialicons-regular.otf
```

Hasil di build/phase2-review; font untuk pemeriksaan lokal, tidak dibundel aplikasi. Tes ini dilewati pada suite biasa. Login nyata Android sudah berhasil. Pengujian HP lanjutan mencakup logout/cold restore akun nyata, KPI run yang sama dengan React, picker upload pada database terisolasi, simpan/open export, keyboard, Back, gesture bars, offline/reconnect dan ikon bermasker. Jangan mengirim aksi mulai/retry/resume pada backend nyata tanpa izin biaya terpisah.

## Troubleshooting

- Alamat server belum diatur: tambahkan API_BASE_URL pada run/build dan rebuild APK.
- 422 login: kredensial harus cocok dengan akun sah; akun legacy plaintext belum dapat memakai token mobile. Jangan reset/seed otomatis.
- 503 login mobile pada DB existing: periksa migration token setelah verifikasi backup/target DB.
- 401: sesi expired/revoked, masuk kembali. Tidak ada refresh token atau penyimpanan password.
- Koneksi HP gagal: periksa USB authorization, adb reverse, binding/port server; gunakan LAN privat bila diperlukan.
- Antrean tidak bergerak: baca queue_health dan diagnosis README utama. Membuka status tidak menyalakan worker.
- Build pertama lambat: dependency native memerlukan SDK Platform 35; Gradle SDK installer lama bisa lambat. Gunakan Android CLI resmi untuk `sdk install platforms/android-35`, lalu ulangi build; jangan nonaktifkan TLS atau mengedit cache package.
- Release belum layak publikasi hanya dari debug APK: siapkan domain HTTPS, signing, izin namespace, backup/recovery dan uji perangkat.


Untuk screenshot native realtime, mulai `tool/capture-native-checkpoints.ps1 -AdbPath <path-adb.exe>` pada terminal pertama sebelum drive. Pada terminal kedua tambahkan `--dart-define=CAPTURE_NATIVE_CHECKPOINTS=true`, tulis output drive ke `build/phase2-device-checkpoints.log`. Delapan checkpoint menahan halaman tiga detik, hasil `build/device-review/live-phase2-*.png`; driver screenshot engine tetap bekerja biasa. Callback driver sesudah tes tidak dipakai untuk mengklaim layar native tiap halaman.

Hasil terakhir yang dipertahankan: Laravel 103 tes / 3.110 assertions, Flutter 29 tes + 1 screenshot opt-in skipped, build/lint React, build APK dan tiga perjalanan fixture HP lulus. Migration Sanctum aktual sudah diterapkan dan login nyata Android berhasil sesuai konfirmasi pengguna. Finalisasi tidak mengulang tes/build/screenshot. Keterbatasan tersisa: verifikasi web melalui computer-use, perbandingan dataset/run aktual dengan React, cold restore akun nyata, import/export native pada server terisolasi, accessibility/lintas perangkat dan kesiapan release (signing, HTTPS, backup/recovery). Tidak menjalankan DeepSeek/worker/reset DB atau commit/push. Lihat laporan untuk hash APK dan batas pengujian.