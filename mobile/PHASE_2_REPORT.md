# FTEMation Mobile - Phase 2

12 November 2026, Asia/Jakarta. Status: **finalisasi implementasi Tahap 2 selesai; migration Sanctum telah diterapkan dan login nyata Android berhasil**, sesuai hasil terbaru yang dikonfirmasi pengguna. Tes/build/screenshot yang sebelumnya lulus tidak diulang saat finalisasi dokumentasi. Ini bukan klaim production-ready.

## Implementasi

Tahap A mempertahankan tema navy/cyan, simbol F/bar-chart/panah existing, splash dan header. Launcher existing sudah simbol tanpa tulisan. Ditambahkan adaptive monochrome API 33; safe inset existing dipertahankan. Tidak membuat logo raster/placeholder atau dua alternatif yang belum direview. Native splash simbol sudah ditinjau pada HP; perbandingan launcher 48px/72px, monochrome dan seluruh mask launcher tetap memerlukan review khusus. Tidak mengubah application ID `com.tancorp.ftemation_mobile`. Namespace mewakili organisasi: pemilik perlu memastikan izin, atau menyiapkan namespace dari domain miliknya sebelum publikasi. Tidak ada perubahan formula/prompt.

Tahap B memeriksa provider password, hashed cast, session regeneration/logout, CSRF, limiter, routes dan ownership. Implementasi hashing sebelumnya dipertahankan. Audit awal menemukan satu akun plaintext; audit akhir menemukan nol setelah login/perubahan akun oleh pemilik. Kegagalan 422 konfigurasi smoke lama adalah temuan historis, bukan status login Android terbaru: login nyata Android kini berhasil sesuai konfirmasi pengguna. Tidak ada reset/seeder atau perubahan password oleh agen. Login mobile tetap menolak akun plaintext. Verifikasi positif web melalui computer-use belum tersedia sebagai bukti akhir; dicatat sebagai keterbatasan verifikasi tanpa percobaan ulang.

Tahap C menambahkan HasApiTokens, migration infrastruktur personal_access_tokens, endpoint login/logout mobile dan middleware kemampuan token. Login mobile memverifikasi hash existing melalui provider, tanpa membuat session web. Expiry default 24 jam, dibatasi 1..168 melalui MOBILE_TOKEN_HOURS; kemampuan workload:access wajib pada seluruh API privat untuk token. Logout mencabut token aktif saja. Ownership tetap Laravel. Flutter menyimpan token melalui flutter_secure_storage, memvalidasi profil saat restore, menghapus sesi/workspace saat 401, dan tidak menyimpan password. Tidak ada bypass Demo UI. Logout gagal jaringan dilaporkan dan dapat dicoba ulang. Clear secure storage lama ditunggu sebelum menyimpan sesi baru.

Tahap D mengganti dependensi widget produksi terhadap DemoState dengan Provider SessionState/WorkspaceState, repository API dan RunState. Dataset dan aktivitas paginated, search/filter server, refresh, state loading/empty/error, pembatalan request serta generation guard tersedia. Dashboard menampilkan nilai summary Laravel, termasuk total/saving/count/departemen/peluang/status; tidak menghitung FTE atau klasifikasi. Hasil menampilkan riwayat run, model/prompt/progress, alasan/rekomendasi, faktor/risk/effort/oversight/group dan ringkasan karyawan/departemen. Lifecycle start/retry/cancel/resume meminta konfirmasi; cancel/resume membawa execution_version. Polling hanya selama halaman Analisis aktif dan run belum terminal, berhenti di background/dispose, tidak menyalakan worker. Upload .xlsx maksimal 5 MB memakai pemilih file native, mendukung content URI melalui byte, konfirmasi/progress dan validasi Laravel. Export PDF/XLSX/JSON memakai completion gate backend, validasi MIME dan filename header, lalu pemilih lokasi native tanpa izin storage menyeluruh. Open/share langsung belum ditambahkan.

## Kontrak dan struktur

POST /api/mobile/login menerima username, password, device_name. Sukses 200 mengembalikan user, token, token_type=Bearer, expires_at, dengan no-store. Gagal autentikasi 422 generik; limiter 5/menit per username/IP. GET /api/user kompatibel untuk kedua mekanisme. POST /api/mobile/logout membutuhkan token dan mencabut token tersebut; cookie-only ditolak 403. HTTPS diwajibkan selain local/testing. React tetap memakai session Sanctum/CSRF.

Endpoint terhubung: GET /api/imports; GET /api/imports/{id}; GET /api/imports/{id}/activities; GET/POST /api/imports/{id}/analyses; GET /api/analyses/{run}; POST retry/cancel/resume; POST /api/imports; GET export/{json,xlsx,pdf}. Tidak menambah endpoint bisnis duplikat, database kedua atau akses AI dari Flutter.

```text
mobile/lib/
  core/api/            ApiClient, ApiException, Dio dan error mapping
  core/storage/        TokenStorage
  core/format.dart     formatter tampilan
  core/theme/, widgets/
  core/demo/           fixture Tahap 1, tidak diimpor aplikasi normal
  navigation/          router session guard dan shell lima tab
  features/auth/       login dan SessionState
  features/datasets/   repository bersama, WorkspaceState, dataset/upload
  features/analysis/   RunState dan lifecycle UI/polling
  features/overview/, activities/, results/, help/, splash/
mobile/test/support/   fake Dio adapter dan penyimpanan token memory
```

Alur UI -> state/Provider -> repository -> Dio -> Laravel. Model response sederhana menggunakan Map di batas repository; tidak menambahkan domain/usecase/interface layer. Dependency langsung tambahan: dio 5.11.1 (HTTP/cancel/upload), flutter_secure_storage 11.2.0 (token aman), file_picker 13.3.3 (picker/simpan native). Versi terkunci pubspec.lock, API diperiksa dari dokumentasi dan source terpasang. Flutter 3.47.4/Dart 3.13.3, AGP 9.1 dan Java compatibility 17 dipertahankan. Dependency transitive JNI/platform mengikuti package picker.

## Database dan keamanan

Migration database/migrations/2026_11_12_000002_create_personal_access_tokens_table.php **telah diterapkan pada database aktual**, sesuai hasil terbaru yang dikonfirmasi pengguna. Tabel personal_access_tokens merupakan infrastruktur Sanctum; tujuh tabel domain tetap. Catatan Pending/schema token belum ada dari pemeriksaan awal telah digantikan hasil terbaru ini. Finalisasi dokumentasi tidak menjalankan migration atau mengubah database.

Audit aktual: satu akun; awal satu legacy plaintext, akhir nol (pengguna mengonfirmasi login/perubahan akun); username demo tetap tidak ada; 0 orphan owner, 0 mismatch dataset activity/employee dan analysis/activity, 0 upload privat hilang. Agen tidak menjalankan reset, seed akun, perubahan password aktual, penghapusan job atau perubahan hasil AI. Perubahan kondisi hash akun oleh pemilik dicatat terpisah; jangan mengklaim tabel users identik. Snapshot history sebelum/sesudah identik untuk imports, employees, activities, activity_groups, analysis_runs, activity_analyses, keempat completed report dan semua file export historis. Bukti lokal di storage/framework/testing/phase2-history-before.json, phase2-history-after.json dan phase2-integrity.json. History: 4 imports, 54 employees, 270 activities, 20 groups, 5 runs dan 390 activity analyses. Run 5 tetap cancelled; tidak ada inference baru.

Release Android menolak cleartext melalui manifest dan konfigurasi client; debug overlay mengizinkan HTTP development. Internet permission di main, allowBackup=false, tidak meminta permission broad storage. URL via API_BASE_URL, tidak ada IP/key/password hardcoded. Token tidak ada di URL/analytics/log. Signing release existing masih debug dan perlu diganti oleh pemilik sebelum distribusi.

## Pengujian aktual

| Pemeriksaan | Hasil |
|---|---|
| Tahap A format/analyze/test/build sebelum integrasi | Lulus; 9 widget test dan APK debug dibangun. Bukan bukti APK akhir Tahap 2. |
| Auth web/mobile terisolasi | 19 tes / 131 assertions pada gate awal; diperluas ownership/import pada suite akhir. |
| Laravel seluruh suite akhir | 103 passed, 3.110 assertions, SQLite in-memory/fake HTTP/queue. |
| Pint, composer validate, node --check smoke | Lulus. |
| React build dan lint | Lulus TypeScript/Vite dan oxlint; source React/auth cookie tidak diubah. |
| Flutter format/analyze | Pemeriksaan akhir tanpa issues. |
| Flutter unit/widget | 29 passed, 1 screenshot test opt-in skipped pada suite default; pengambilan screenshot terpisah lulus. |
| Renderer visual | 6 screenshot fixture API 390x844 di build/phase2-review, ditinjau dengan font nyata lokal. Bukan screenshot native/HP. |
| HP fb0caebb | Lulus tiga perjalanan fixture pada fb0caebb / 2312DRA50G / Android 16 API 36. Termasuk GET guest melalui adb reverse, native secure storage key terpisah, restore dan logout. Login nyata Android kemudian berhasil sesuai konfirmasi terbaru pengguna; perjalanan fixture ini tetap bukti terisolasi. |
| Web session live | Smoke aktual: 401 guest, 419 tanpa CSRF, 204 CSRF cookie dan 422 password salah lulus; percobaan positif pada pemeriksaan awal menghasilkan 422 (historis). Pengguna menyampaikan telah mengisi env, tetapi pemeriksaan PHP tetap menemukan SMOKE_USERNAME/PASSWORD tidak terkonfigurasi; fallback demo tidak ada di DB. Tidak mencoba menebak. Fixture regression lulus. |
| Import/export | Valid/invalid import, pagination, ownership dan lifecycle/export backend diuji di SQLite/fakes; export filename/MIME dan completion error di fake Dio. Picker/simpan/open export native belum diuji dengan completed run nyata di HP. |
| DeepSeek | Tidak dipanggil; tidak menyalakan worker operasional atau menggunakan saldo. |

Tes Flutter mencakup login berhasil/gagal tanpa bypass, restore/logout, expired session, error HTTP 400/401/403/404/409/422/429/500/503, tidak ada auto-retry mutasi, stale dataset, navigasi, KPI server, search API, detail hasil/root modal, dataset aktif, lifecycle execution_version, completion export, tiga viewport 320x568/390x844/800x360 dan skala teks 1,6. Screenshot opt-in dijalankan terpisah; dilewati secara eksplisit pada suite default. Integration test Android diperbarui menjadi perjalanan fixture API yang tidak melakukan mutasi/inference aktual, hasil eksekusi perangkat dicatat pada bagian verifikasi akhir.

Temuan diperbaiki: API file_picker 13 berbeda dari versi lama (List<PlatformFile>, length(), URI dan saveFile bytes), nullable path Android tidak selalu tersedia, badge semula membandingkan enum kapital dengan nilai lowercase server, separator encoding rusak, guarded async context picker, dan harness detail perlu scroll tombol sepenuhnya di atas navigation bar. Screenshot awal memakai font kotak Ahem; diulang memakai font lokal Roboto alias dan MaterialIcons sebelum review keterbacaan. Format dan lints diperbaiki sebelum validasi akhir.

## Batas dan pekerjaan berikutnya

1. Migration Sanctum dan login nyata Android sudah selesai; tidak perlu diulang untuk finalisasi ini.
2. Verifikasi web melalui computer-use belum tersedia sebagai bukti akhir. Perbandingan React/Android pada dataset/run aktual yang sama tetap belum terverifikasi.
3. Lanjutkan pengujian cold restore akun nyata setelah proses OS mati, offline/reconnect serta picker upload dan simpan export native pada database terisolasi. Keyboard, Back, safe area dan splash yang sudah lulus tidak perlu diulang tanpa perubahan terkait.
4. Review ikon kecil/mask launcher, font/accessibility/TalkBack; existing logo dipertahankan.
5. Open/share langsung, performance dataset besar/report penuh, lintas perangkat, release signing, HTTPS production, backup recovery dan lifecycle jangka panjang masih tersisa. API history existing dibatasi 30 run; report completed dibaca penuh.
6. Inference nyata dan pemulihan worker production memerlukan izin biaya terpisah. Fixture bukan pengukuran akurasi AI.

Petunjuk menjalankan backend/React, Android emulator/USB/LAN, build debug/release, kontrak token, mock provider, screenshot test dan troubleshooting ada di README mobile. Bukti Tahap 1 dipertahankan dengan catatan transisi, bukan ditimpa sebagai bukti Tahap 2. Tidak commit/push.

## Verifikasi build akhir

APK debug Tahap 2 berhasil dibangun setelah instalasi SDK/CMake dan perbaikan konfigurasi. Instalasi SDK Platform 35 oleh installer Gradle lama sempat tidak menunjukkan progres. Build dihentikan untuk diagnosis dan instalasi diteruskan dengan Android CLI resmi dari HTTPS dl.google.com. Tidak menonaktifkan TLS, mengubah package cache, atau mengubah konfigurasi global keamanan. Build akhir, pemasangan dan startup main.dart selesai dengan exit 0. Hasil APK dicatat di bawah.

Bug native tambahan: manifest overlay debug memerlukan tools:replace untuk usesCleartextTraffic, sehingga HTTP debug tidak melemahkan manifest release. Kotlin incremental cache gagal merelatifkan sumber package di C: terhadap workspace D:; kotlin.incremental=false dibatasi pada gradle.properties proyek. CMake 3.22.1 diperlukan dependency JNI dan dipasang melalui Android CLI resmi. Tidak menghapus cache package atau mengubah global Gradle pengguna.

## Hasil akhir perangkat dan artefak

`flutter drive --driver=test_driver/integration_test.dart --target=integration_test/device_test.dart -d fb0caebb --dart-define=API_BASE_URL=http://127.0.0.1:8000 --dart-define=CHECK_LOCAL_BACKEND=true` lulus. Perjalanan yang sama diulang untuk verifikasi tangkapan layar native; total tiga perjalanan lulus. Satu perjalanan test aplikasi per run, runner juga melaporkan tearDownAll. Tidak ada RenderFlex/Flutter exception pada log pemeriksaan akhir. Warning vendor GraphicBuffer/qdgralloc saat konversi screenshot tetap dicatat; screenshot akhir terlihat benar, renderer tidak dinonaktifkan.

CHECK_LOCAL_BACKEND hanya mengirim GET /api/user tanpa token dan memverifikasi 401 melalui USB reverse: backend dapat dijangkau dari HP tanpa membuka firewall. Seluruh login/data/report dalam perjalanan tersebut berasal dari FakeBackend, bukan data akun aktual. Token fixture ditulis/dibaca/dihapus melalui plugin secure storage Android pada key ftemation.phase2.integration, terpisah dari key aplikasi normal. Restore memuat ulang root aplikasi dan memvalidasi profil fixture; ini belum membuktikan cold restore akun nyata setelah proses OS mati.

Delapan screenshot native realtime di build/device-review/live-phase2-{login,overview,datasets,analysis,results,activities,restored,logout}.png sudah ditinjau. Header, dataset context, lima tab dan gesture/status bar utuh. Screenshot engine dengan nama phase2-*.png juga tersedia. Pengambilan native awal melalui callback driver berlangsung setelah test; berkas phase2-*-native.png tanpa prefix live **tidak digunakan sebagai bukti halaman**. Pengambilan ulang memakai checkpoint tiga detik dan ADB, direproduksi dengan tool/capture-native-checkpoints.ps1.

Aplikasi normal dipasang kembali dengan `flutter run -d fb0caebb --debug --no-resident --dart-define=API_BASE_URL=http://127.0.0.1:8000` dan exit 0. Entry point lib/main.dart, bukan runner integration_test. Pada pemeriksaan tersebut perangkat ditinggalkan pada login normal, tanpa Demo UI atau token fixture produksi. Native keyboard, scroll sampai tombol Masuk dapat terlihat di atas keyboard, Android Back menutup keyboard, dan status/gesture bars diperiksa. Bukti: phase2-normal-login.png, phase2-normal-keyboard.png, phase2-normal-back.png, phase2-keyboard-scroll-verified.png. Rekaman startup phase2-startup.mp4 dan frame phase2-startup-frames/frame-03.png memperlihatkan simbol splash putih/cyan utuh tanpa tulisan launcher. Tidak memasukkan credential aktual atau token pada gambar.

APK akhir `mobile/build/app/outputs/flutter-apk/app-debug.apk`: 163.096.384 byte; SHA-256 `ca5e0d0496cc48f47634e3197607e1d35d2423ab6650f0d862406b37da44e691`. Paket com.tancorp.ftemation_mobile, version 1.0.0+1, min SDK 24, compile/target SDK 36. Debug signing, belum layak distribusi production. `flutter build apk --debug` juga lulus sebelum pengulangan integration_test; APK main.dart terakhir dibangun kembali oleh flutter run.

Status akhir: **migration Sanctum telah diterapkan dan login nyata Android berhasil**, berdasarkan konfirmasi terbaru pengguna. Tidak ada blocker migration/login Android yang tersisa. Verifikasi web melalui computer-use dan perbandingan Web/Flutter pada user/run aktual yang sama belum tersedia; konsistensi sebelumnya dibuktikan dengan kontrak dan fixture. Finalisasi hanya memperbarui dokumentasi serta memeriksa Git status dan whitespace; tidak mengulang suite, build APK atau screenshot perangkat, tidak menjalankan DeepSeek/worker/reset database, dan tidak commit/push. Release production masih memerlukan pekerjaan yang tercantum di atas.