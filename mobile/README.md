# FTEMation Mobile

Android UI prototype Tahap 1, mengikuti FTEMation Web. Seluruh angka dan rekomendasi adalah fixture sintetis, bukan data produksi atau inference DeepSeek. Tidak memerlukan backend/database. Tidak ada kredensial, token, HTTP client, worker atau koneksi AI.

## Instalasi dan menjalankan

Dari repository, masuk `mobile/`. Prasyarat: Flutter stable (diverifikasi 3.47.4, Dart 3.13.3), Android SDK, JDK yang kompatibel dengan Gradle, lisensi SDK diterima, HP dengan USB debugging dan otorisasi komputer. Android Studio dapat memasang toolchain. Windows desktop/Visual Studio tidak diperlukan.

```powershell
cd D:\Project\FTE-Mation\mobile
flutter doctor -v
flutter pub get
flutter devices
flutter run -d fb0caebb
```

HP lain: ganti ID dari `flutter devices`. Aplikasi bernama FTEMation, application ID `com.tancorp.ftemation_mobile`. Tidak perlu username/password: pilih **Masuk ke Demo UI**. Dataset aktif berlaku di semua halaman selama aplikasi hidup; kembali ke login mempertahankan pilihan, restart proses mengembalikan dataset pertama.

## Quality checks

```powershell
dart format .
flutter analyze
flutter test
flutter build apk --debug
flutter drive --driver=test_driver/integration_test.dart --target=integration_test/device_test.dart -d fb0caebb
```

APK: `build/app/outputs/flutter-apk/app-debug.apk`. Debug APK memakai debug signing, bukan artefak Play Store. Integration test memasang dan menjalankan aplikasi pada perangkat yang disebutkan; screenshot tersimpan di `build/device-review/` (diabaikan Git). USB debugging/screenshot hanya dipakai untuk QA lokal. Hasil aktual ada di `PHASE_1_REPORT.md`.

## Struktur dan tanggung jawab

- `android/`: host Android, native splash dan launcher adaptive vector.
- `assets/images/`: salinan logo web; `assets/icons/`: SVG mark asli web.
- `lib/main.dart`, `app.dart`: bootstrap, theme, Provider dan lifecycle router.
- `lib/core/theme/app_theme.dart`: palet, spacing/radius dan tema Material 3.
- `lib/core/demo/demo_data.dart`: model fixture dan satu ChangeNotifier pilihan dataset.
- `lib/core/widgets/`: brand, panel, selector dataset, halaman scroll, notice dan dialog integrasi.
- `lib/navigation/`: router, daftar tujuan dan shell header/bottom navigation.
- `lib/features/`: splash, auth, overview, datasets, analysis, results, activities dan help. Masing-masing memiliki halaman sendiri; bottom sheet aktivitas berada bersama fitur activities.
- `test/`: tes widget, konsistensi fixture dan viewport.
- `integration_test/`, `test_driver/`: perjalanan UI HP dan penyimpanan screenshot.

Navigasi: native splash lalu Flutter splash tanpa timer buatan, login preview, Overview. Lima tab: Import Dataset, Analisis AI, **Overview** di tengah, Hasil Analisis, Data Aktivitas. Menu kanan: bantuan, informasi aplikasi, kembali ke login. Back dari tab non-Overview kembali ke Overview; bantuan/detail/dialog mengikuti stack Android. Konten scroll di atas bottom navigation dan SafeArea.

## Referensi desain dan dependency

Audit membaca README, `docs/UI_DESIGN.md`, audit pra-Flutter, CSS base/login/mobile-navigation, MobileNavigation/WorkspaceLayout/navigation, halaman Overview/Activities/Imports/Analysis/Help, MetricCard/OpportunityCards dan brand web. Navy/cyan, panel putih, canvas netral, label dataset, bottom navigation dan istilah dipertahankan. Typography memakai font Android sistem untuk keterbacaan, bukan mengasumsikan Segoe UI tersedia. Tidak ditemukan video referensi di workspace. Workbook referensi tetap di `../samples/`; fixture UI ini sengaja sintetis dan lebih kecil, bukan klaim mereplikasi assessment final.

Dependency runtime hanya Provider untuk dataset bersama, go_router untuk route/Back, dan flutter_svg untuk merender mark existing secara tajam. Grafik perbandingan sederhana memakai progress bar berlabel FTE, sehingga fl_chart tidak diperlukan. integration_test adalah dependency SDK development untuk verifikasi perangkat. Tidak memakai Dio atau secure storage.

Launcher menggunakan path dari mark existing, inset aman adaptive icon, tanpa teks panjang. Ini adaptasi aset, bukan desain logo baru. Review visual brand/launcher sebelum rilis tetap diperlukan. Splash Android 12+ dan fallback memakai navy; UI header memakai mark putih seperti mobile web.

## Menambah halaman dan integrasi API

Tambahkan `<fitur>_page.dart` di `lib/features/<fitur>/`, daftarkan GoRoute di `navigation/app_router.dart`; tambahkan destinasi hanya bila memang menjadi tab utama. Widget satu fitur tetap lokal. Widget bersama masuk core/widgets. State filter lokal; state lintas halaman di Provider. Pergantian dataset memberi key baru pada halaman dengan filter/riwayat agar tidak memakai konteks lama.

Tahap 2: ganti model DemoDataset/DemoActivity dan sumber state di core/demo dengan respons Laravel yang tervalidasi. Halaman saat ini membaca state dan model, tidak mengakses fixture langsung kecuali selector/daftar dataset; ganti daftar tersebut dengan koleksi dari state API. Tambahkan repository HTTP hanya saat digunakan, lalu loading/error/retry/cancellation dan penolakan respons stale. UI tidak perlu dibangun ulang. Flutter tidak boleh menghitung ulang FTE/saving/prioritas: semua angka dari snapshot Laravel. Penjumlahan bar departemen saat ini hanya agregasi fixture untuk grafik, bukan kalkulasi assessment.

Sepakati kontrak autentikasi Android dengan backend terlebih dahulu; session web Sanctum tidak otomatis menjadi login token mobile. Tidak ada perubahan backend atau janji issuance token pada tahap ini. Setelah kontrak disetujui, baru tambahkan HTTP client, penyimpanan aman, HTTPS, expiry/logout, ownership dan penanganan 401/403/409/422/429. Jangan masukkan API key DeepSeek ke aplikasi.

## Batas Tahap 1 dan troubleshooting

Import, export, mulai/retry/cancel/resume hanya menampilkan penjelasan Tahap 2. Galeri status bukan eksekusi server. Riwayat terdiri dari snapshot selesai dan dibatalkan yang diberi label demo. Dataset kosong tersedia untuk memeriksa empty state. Tidak ada penyimpanan permanen, file picker, login nyata atau AI nyata.

- Perangkat tidak terlihat: cek kabel data, USB debugging, dialog otorisasi RSA dan driver OEM. Periksa `flutter devices`; emulator offline bukan pengganti HP.
- SDK/lisensi: jalankan `flutter doctor --android-licenses`, periksa SDK/JDK di doctor.
- Gradle pertama lama: perlu mengunduh distribusi dan dependency Google/Maven. Periksa jaringan/proxy Java; jangan nonaktifkan TLS. Tidak perlu menghapus cache pengguna.
- `pub get` gagal: periksa akses pub.dev, Flutter/Dart sesuai constraint, lalu ulangi.
- Aset tidak ditemukan setelah perubahan pubspec: `flutter pub get` dan restart penuh.
- Keyboard menutupi daftar: daftar tetap scroll; sembunyikan keyboard dengan Back sebelum membuka detail.
- Release: tentukan signing sendiri; konfigurasi generated release saat ini memakai debug signing dan bukan siap distribusi produksi.

Pada Android Command-line Tools baru, jika `sdkmanager` menulis `Package ndk not found`, gunakan Android CLI secara langsung untuk versi yang diminta Flutter (environment ini: `android --no-metrics sdk install ndk/28.2.13676358`). Wrapper sdkmanager lama dan CLI baru memakai format nama paket berbeda. Pastikan binary `android.exe` dari SDK cmdline-tools yang digunakan, lalu ulangi build.
