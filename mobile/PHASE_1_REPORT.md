# FTEMation Mobile - Phase 1 Report

Tanggal: 12 November 2026 (Asia/Jakarta). Status akhir: **READY untuk Tahap 1 (UI prototype Android)**. Seluruh halaman, navigasi, fixture bersama, test, build APK dan pengujian pada HP fisik telah diverifikasi. Integrasi backend tetap pekerjaan Tahap 2.

## Lingkup dan audit

Implementasi hanya di `mobile/`. Laravel, React, migration, database dan analisis AI tidak diubah. Tidak menghubungi DeepSeek, menjalankan worker, commit atau push. Working tree awal sudah memuat perubahan pengguna pada README, auth provider, User dan AuthenticationTest, serta dokumen/script audit pra-Flutter; semuanya dipertahankan.

Sumber desain: README, `docs/UI_DESIGN.md`, `docs/PRE_FLUTTER_AUDIT.md`, CSS base/login/mobile-navigation, MobileNavigation, WorkspaceLayout, navigation, Overview/Activities/Imports/Analysis/Help, MetricCard/OpportunityCards dan kedua aset brand. Workbook referensi dibaca untuk memeriksa sheet Workload dan sembilan header. Tidak ditemukan video referensi mp4/webm pada audit awal workspace. Screenshot referensi web Overview 390px yang sudah tersedia juga ditinjau; rekaman HP baru dibuat hanya sebagai bukti QA. Tidak menyalin arsip assessment.

Identitas: navy #071E45, navy soft #143762, primary #006EAB, cyan #00A8DC, text #172E4D, muted #5C6E85, border #E0E7F0, canvas #F4F6FA, surface putih. Hierarki judul/KPI, kartu putih, spacing 8/16/24, radius panel 16 dan target tap sekitar 48 dipertahankan. Font Android sistem dipakai sebagai adaptasi mobile dari Segoe UI web. Grafik batang horizontal berlabel FTE menghindari chart berat. Native splash, adaptive launcher dan header menggunakan aset mark existing; ini adaptasi, bukan logo baru. Final review launcher/brand sebelum rilis masih diperlukan.

## Struktur aktual dan file penting

```text
mobile/
  android/                    # host Android, vector launcher, native splash
  assets/images/              # ftemation-logo.webp
  assets/icons/               # ftemation-mark.svg
  lib/
    main.dart
    app.dart
    core/
      theme/app_theme.dart
      demo/demo_data.dart
      widgets/brand.dart
      widgets/workspace_widgets.dart
    navigation/
      app_router.dart
      app_navigation.dart
      workspace_shell.dart
    features/
      splash/splash_page.dart
      auth/login_page.dart
      overview/overview_page.dart
      datasets/datasets_page.dart
      analysis/analysis_page.dart
      results/results_page.dart
      activities/activities_page.dart
      activities/activity_detail.dart
      help/help_page.dart
  test/widget_test.dart
  integration_test/device_test.dart
  test_driver/integration_test.dart
  pubspec.yaml
  pubspec.lock
  README.md
  PHASE_1_REPORT.md
```

Template Flutter juga menghasilkan analysis_options.yaml, .metadata, .gitignore serta Gradle/Kotlin wrapper standar. Artefak build dan konfigurasi lokal diabaikan Git.

## Fitur berfungsi

- Splash tanpa penundaan timer, login preview tanpa verifikasi kredensial, tombol Masuk ke Demo UI.
- Header navy, menu bantuan/informasi/kembali login, lima tab sesuai urutan web dengan Overview di tengah.
- Dataset bersama melalui Provider; dua fixture berisi data dan satu kosong; pilihan mengubah konteks seluruh halaman dan mereset filter pada pergantian dataset.
- Dashboard: total FTE, saving, karyawan/departemen, grafik departemen dan peluang ke halaman hasil.
- Daftar/pemilihan dataset dan penjelasan import sembilan kolom, tanpa upload palsu.
- Galeri status queued/processing/completed/cancelled/failed/cancel_requested; progres ilustratif, penggunaan AI belum tersedia, penjelasan cancel/resume tanpa request server.
- Riwayat snapshot demo selesai/dibatalkan, filter High/Medium/Low, ringkasan departemen/karyawan, rekomendasi dan bottom sheet detail.
- Aktivitas: pencarian kode/nama/karyawan, filter departemen/frekuensi, FTE dan detail.
- Panduan FTE, klasifikasi, oversight, saving dan versi.
- Empty state nyata dari fixture kosong/pencarian kosong; error dan success berupa skenario demo berlabel jelas; loading pada startup, tanpa simulasi request backend.

Mock data sintetis kecil dan konsisten. FTE/saving adalah nilai tetap fixture, bukan kalkulasi ulang rumus Laravel. Penjumlahan departemen hanya agregasi tampilan fixture. Tidak mengklaim inference aktual. Tidak ada persistence login atau kredensial. Tidak mengekspor results.json.

## Pengujian terverifikasi

| Pemeriksaan | Hasil |
|---|---|
| flutter doctor -v | Flutter 3.47.4 stable / Dart 3.13.3. Android toolchain dan lisensi tersedia. Visual Studio Windows tidak lengkap, tidak menghalangi target Android. Emulator-5554 offline. |
| flutter devices | HP 2312DRA50G, ID fb0caebb, android-arm64, Android 16 API 36 terdeteksi. |
| flutter pub get | Lulus. Runtime: provider, go_router, flutter_svg. Dev: flutter_test, flutter_lints, integration_test SDK. |
| dart format . | Lulus. |
| flutter analyze | No issues found pada pemeriksaan terakhir. |
| flutter test | 9 passed: konsistensi angka fixture; startup/router/lima tab/dataset/dashboard; pencarian/filter/detail/empty; viewport 320x568, 390x844, 800x360; dialog integrasi/bantuan; seluruh status AI/filter hasil/detail rekomendasi; Back dan dataset kosong. |
| flutter build apk --debug | Lulus, APK normal lib/main.dart dibangun kembali setelah tes integrasi. |
| flutter run -d fb0caebb --no-resident | Lulus: APK dipasang, engine Flutter/Impeller Vulkan dimuat, file tersinkron, aplikasi berjalan di HP. Flag no-resident melepas sesi debug setelah startup. |
| flutter drive ... -d fb0caebb | Lulus dua kali, termasuk pengulangan setelah perbaikan visual dan root modal; satu perjalanan end-to-end per run, runner juga menghitung tearDownAll. Screenshot dari pengulangan terakhir ditinjau. |
| Pengujian native tambahan | Cold start, splash, login, keyboard Android, input pencarian, dan Back melalui adb diverifikasi dengan rekaman/screenshot layar penuh. |

Temuan awal yang diperbaiki: splash menunggu decoding gambar membuat widget test timeout; diubah menjadi navigasi frame berikutnya tanpa timer. ListTile di dalam panel memerlukan Material lokal untuk ink; diperbaiki. Test detail di layar pendek perlu scroll tombol sepenuhnya ke viewport; harness diperbaiki. Setelah koreksi, tes berulang lulus. Peninjauan HP juga menemukan bottom sheet perlu root navigator agar navigasi belakang tidak dapat digunakan; diperbaiki dan ditambahkan assertion hit-test. Border input serta radius tombol disesuaikan kembali dengan web dan tes HP diulang. Tidak ditemukan RenderFlex overflow pada tiga viewport yang diuji; ini bukan sertifikasi seluruh perangkat atau ukuran font aksesibilitas.

Gradle pertama sempat macet pada unduhan Java. Distribusi resmi 9.3.1 diunduh melalui HTTPS, di-resume setelah timeout, diperiksa SHA-256 terhadap checksum resmi, lalu diletakkan pada cache wrapper. Tidak menonaktifkan TLS atau mengubah konfigurasi global pengguna. Percobaan ulang menggunakan IPv4 Java untuk diagnosis lokal dan akhirnya lulus.

Diagnosis build berikutnya: dependency Google sempat gagal DNS `dl.google.com`; restart daemon lokal dan retry mengunduh artefak tersebut. Build kemudian terhenti pada NDK 28.2.13676358 yang belum ada. Wrapper sdkmanager pada Command-line Tools baru memecah nama paket menjadi `ndk` dan versi, sehingga tidak menemukan paket. Instalasi diteruskan lewat binary resmi `android.exe --no-metrics sdk install ndk/28.2.13676358`, sesuai bantuan CLI lokal. Tidak mengubah wrapper SDK atau konfigurasi global pengguna.

## Pengujian HP dan artefak akhir

Perangkat utama: **2312DRA50G / fb0caebb / Android ARM64 / Android 16 API 36**, resolusi tangkapan 1220x2712. Ini pengujian HP nyata, bukan emulator. Aplikasi normal dipasang kembali sesudah integration_test dan dibiarkan terbuka pada Overview dengan dataset operasional demo.

Perjalanan integration_test: startup ke login, masuk demo, dashboard, semua lima tab, pencarian Ayu, detail aktivitas, pemilihan dataset Layanan melalui dropdown, KPI berubah menjadi 0,5000 FTE, lalu Pusat Bantuan. Screenshot terakhir diperiksa untuk login, dashboard, import, analisis, hasil, aktivitas, detail dan bantuan. Header dan tab aktif terbaca; data scroll di atas bottom navigation; modal kini menutup interaksi shell. Tidak ditemukan overflow/exception Flutter pada perjalanan ini.

Verifikasi native tambahan memakai aplikasi normal: rekaman cold start memperlihatkan launcher icon adaptif, splash navy dengan simbol putih/cyan, kemudian login; tidak ada penundaan buatan. Cold start debug yang terukur lewat am start -W sekitar 3,3-3,7 detik, bukan benchmark release. Rekaman pertama pada resolusi default gagal encoder dan menghasilkan file kosong; pengulangan 720x1600 berhasil (140 frame). Keyboard sistem diperiksa memakai tap dan input adb, bukan hanya enterText widget. Teks Ayu terlihat, hasil menjadi satu aktivitas, daftar tetap scroll. Back menutup IME dan kembali ke Overview; screenshot setelah animasi selesai memperlihatkan bottom navigation serta gesture handle utuh. Status bar navy memakai ikon terang, area gesture workspace putih dengan handle gelap.

Bukti lokal (diabaikan Git):

- `build/device-review/01-login.png`, `02-overview.png`, `datasets.png`, `analysis.png`, `results.png`, `activities.png`, `08-detail.png`, `09-help.png`: screenshot integration_test terakhir.
- `build/device-review/native-startup-720.mp4`: rekaman startup berhasil; frame splash `native-startup-2.0.png` dan login `native-startup-4.0.png`.
- `build/device-review/native-login.png`, `native-keyboard.png`, `native-back-settled.png`: screenshot native termasuk system bars/keyboard.
- `build/device-integration.log`: log pengulangan HP yang lulus. Beberapa warning vendor GPU/Insets muncul saat konversi surface screenshot dan warning JDK native-access muncul saat Gradle; tidak menyebabkan test/build gagal atau cacat visual yang terlihat. Tidak mengubah driver GPU atau menonaktifkan renderer untuk menyembunyikan warning.

APK akhir: **`build/app/outputs/flutter-apk/app-debug.apk`**, 163.098.653 byte (debug, belum dioptimalkan untuk distribusi). SHA-256: `7bbe7aa106a560cdd597fa84edbb7ef83a61adc50412d2c8aea3d42ae5b015ac`. Targetnya `lib/main.dart`, bukan runner integration_test. Signing masih debug; bukan release Play Store.

Tidak ada blocker Tahap 1 yang diketahui dari pemeriksaan ini. Batas verifikasi: hanya satu model HP/API nyata dan tiga viewport widget; TalkBack, skala font ekstrem, semua versi Android, lifecycle berkepanjangan dan performa release belum diuji. Review visual launcher/brand akhir tetap dianjurkan sebelum rilis. Autentikasi/import/inference/export nyata memang belum ada sesuai lingkup. Struktur dan UI siap menerima integrasi Laravel pada Tahap 2 tanpa membuat ulang halaman.

## Tahap 2

- [ ] Sepakati autentikasi Android yang kompatibel dengan Sanctum web; implementasi backend terpisah dan diotorisasi.
- [ ] Tambahkan HTTP client dan secure storage hanya saat digunakan; HTTPS, expiry/logout, handling 401/403/409/422/429.
- [ ] Ganti fixture dengan kontrak Laravel tervalidasi; pagination, loading/error/retry dan abaikan respons dataset stale.
- [ ] Upload Excel privat dengan validasi baris dan transaction pada Laravel.
- [ ] Integrasi lifecycle analisis, version, polling, cancel/resume dan retry terbatas sesuai kontrak server.
- [ ] Tampilkan angka FTE/saving/prioritas dan metadata model/prompt/token dari snapshot Laravel.
- [ ] Export hanya completed run lengkap; hasil JSON dihasilkan aplikasi Laravel.
- [ ] Uji ownership, logout, kegagalan jaringan dan regresi web tanpa inference berbayar tidak diotorisasi.
- [ ] Finalisasi review visual brand, aksesibilitas/TalkBack, font scaling, lifecycle dan signing release.


## Catatan transisi Tahap 2 (12 November 2026)

Bukti Tahap 1 di atas tetap historis. Entry point normal kini memakai autentikasi dan API Laravel, sehingga instruksi masuk Demo UI tidak berlaku untuk kode terbaru. Integration test perangkat diperbarui menjadi perjalanan API fixture terisolasi. Tidak ada klaim bahwa bukti HP Tahap 1 memverifikasi autentikasi atau integrasi Tahap 2. Lihat PHASE_2_REPORT.md dan README mobile terbaru.
