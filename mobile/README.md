# FTEMation Mobile

Client Flutter Android untuk REST API Laravel yang sama dengan React. Workload, FTE, saving, klasifikasi AI dan export berasal dari backend. Tidak ada fallback demo saat jaringan gagal.

## Prasyarat dan konfigurasi

Flutter 3.47.4 / Dart 3.13.3, Android SDK dan JDK dari Android Studio. Backend memerlukan Laravel 13 / PHP 8.4. Versi dependency dikunci di pubspec.lock. Lihat [README utama](../README.md) untuk instalasi backend/database, React dan worker.

`composer dev` menjalankan backend localhost:8000. Pastikan migration backend tersedia, termasuk tabel personal_access_tokens. Pada instalasi existing periksa `php artisan migrate:status` serta target koneksi/backup sebelum migration; jangan reset database atau seed ulang akun pengguna.

Emulator Android:

```powershell
cd mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

HP USB; ganti DEVICE_ID dengan ID dari adb devices:

```powershell
adb -s DEVICE_ID reverse tcp:8000 tcp:8000
flutter run -d DEVICE_ID --dart-define=API_BASE_URL=http://127.0.0.1:8000
```

ADB reverse menghubungkan HP ke backend localhost tanpa membuka firewall LAN. Untuk LAN, gunakan binding development dan firewall jaringan privat yang sesuai; jangan menonaktifkan firewall global. URL diatur melalui dart-define, bukan source.

## Build APK

Dari direktori mobile:

```powershell
flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:8000
flutter build apk --release --dart-define=API_BASE_URL=https://backend.example.invalid
```

Output berada di build/app/outputs/flutter-apk/. Ganti URL release dengan domain backend sebenarnya. Release menolak HTTP di client/manifest; HTTP hanya untuk debug. Tanpa API_BASE_URL, request menampilkan error konfigurasi.

Signing release masih memakai konfigurasi debug; siapkan keystore pemilik sebelum distribusi. Application ID com.tancorp.ftemation_mobile memerlukan izin namespace organisasi. Perubahan ID memengaruhi identitas instalasi dan secure storage. Jangan memasukkan keystore, token atau kredensial dalam Git/argumen build.

## Autentikasi

| Endpoint | Kontrak |
|---|---|
| POST /api/mobile/login | JSON username, password, device_name (maks. 100 karakter); password maks. 255. Sukses: user, token, token_type=Bearer, expires_at; Cache-Control no-store. |
| GET /api/user | Bearer token; user tanpa password/remember_token. |
| POST /api/mobile/logout | Mencabut token aktif saja; session web/perangkat lain tetap berlaku. Cookie-only ditolak 403. |

Login salah, akun tidak ditemukan dan akun plaintext memberi 422 generik. Rate limit 5/menit per username/IP bersama limiter web. Deployment selain local/testing wajib HTTPS. MOBILE_TOKEN_HOURS=24 di backend, dibatasi 1..168 jam saat issuance. Token hashed di Sanctum, kemampuan workload:access, tetap tunduk pada ownership.

Token disimpan lewat flutter_secure_storage, password tidak disimpan, backup Android dinonaktifkan. Startup memvalidasi profil; 401 membersihkan sesi/workspace. Logout offline menampilkan error agar pencabutan server tidak diklaim sukses. Akun plaintext legacy harus login web dengan kredensial sah untuk upgrade hash atau menjalani rotasi terkontrol; jangan reset/seed otomatis.

## Fitur dan API

- GET /api/imports dan /api/imports/{id}: dataset, KPI, departemen, peluang dan snapshot Laravel.
- GET /api/imports/{id}/activities: search, department, frequency, page dan per_page=20.
- GET /api/imports/{id}/analyses dan /api/analyses/{run}: riwayat, metadata, progres dan report.
- POST /api/imports/{id}/analyses serta /api/analyses/{run}/retry|cancel|resume: konfirmasi biaya/tindakan; cancel/resume mengirim execution_version.
- POST /api/imports: multipart .xlsx maksimal 5 MB, upload progress dan error per baris. File picker membaca content URI tanpa akses storage menyeluruh.
- GET /api/analyses/{run}/export/json|xlsx|pdf: hanya completed report; MIME diverifikasi, nama dari header, simpan lewat pemilih lokasi Android. Open/share langsung belum tersedia; gunakan aplikasi Files.

Polling hanya pada halaman Analisis untuk queued/processing/cancel_requested; berhenti saat halaman ditutup/aplikasi background dan tidak overlap. Pergantian dataset menolak respons lama. Mutasi tidak di-retry otomatis. Report belum completed tidak disajikan sebagai hasil final. Riwayat API dibatasi 30 run; report completed dibaca penuh, input aktivitas tetap paginated.

## Struktur

| Direktori | Fungsi |
|---|---|
| lib/core/api/ | Dio, cancellation, error mapping dan HTTPS |
| lib/core/storage/ | Secure token storage |
| lib/core/theme/, lib/core/widgets/ | Tema dan komponen bersama |
| lib/navigation/ | Router/session guard dan shell lima tab |
| lib/features/auth/ | Login dan SessionState |
| lib/features/datasets/ | Repository API, WorkspaceState dan upload |
| lib/features/overview/, activities/ | KPI server, daftar/filter/detail |
| lib/features/analysis/ | RunState, lifecycle dan polling |
| lib/features/results/, help/ | Hasil/export dan panduan |

Alur: UI -> ChangeNotifier/Provider -> repository -> Dio -> Laravel. Tidak ada database kedua atau perhitungan ulang FTE/AI di Flutter. file_picker 13 memakai List<PlatformFile>, length(), readAsBytes() dan saveFile(bytes, mimeType).

## Troubleshooting dan batas release

- Server belum diatur: tambahkan API_BASE_URL lalu rebuild.
- 422 login: periksa kredensial akun sah dan upgrade akun plaintext melalui web.
- 503 login: periksa migration token pada target DB yang benar.
- 401: token expired/revoked; login kembali. Tidak ada refresh token atau penyimpanan password.
- HP gagal terhubung: periksa USB authorization, adb reverse, binding dan port server.
- Antrean tidak bergerak: lihat queue_health/README utama; membuka status tidak menyalakan worker.
- SDK Platform 35 atau CMake belum tersedia: instal melalui Android SDK Manager resmi. Jangan mematikan TLS atau mengedit cache package.
- Windows lintas drive dapat bermasalah dengan cache Kotlin; kotlin.incremental=false dibatasi pada konfigurasi proyek.

Kesiapan production belum dinyatakan. Verifikasi lanjutan meliputi kesetaraan React/Android pada dataset/run nyata, cold restore akun setelah proses OS mati, offline/reconnect, picker upload dan simpan export native pada server terisolasi, TalkBack/accessibility, lintas perangkat, performa report besar, signing, HTTPS dan backup/recovery. Build lokal tidak membuktikan seluruh alur perangkat nyata atau akurasi AI.
