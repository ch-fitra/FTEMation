# Review responsivitas FTEMation — 12 November 2026

## Perubahan

- Navigasi mobile memakai tiga kolom dengan target sentuh minimal 44px; menu tetap langsung tersedia. Sidebar desktop dan identitas navy/putih/cyan dipertahankan.
- Header Overview/Data aktivitas menempatkan profil atau jumlah aktivitas pada baris judul, dengan pemilih dataset pada baris berikutnya. Placeholder tetap memiliki ruang yang sama dengan kontrol terisi.
- KPI menyesuaikan ukuran angka terhadap ruang kartu dan panjang nilai; pada lebar di bawah 360px, kartu menjadi satu kolom. Nilai dan format perhitungan tetap sama.
- Filter ditumpuk pada layar sempit; tab hasil memakai dua kolom di mobile. Teks dataset dapat membungkus tanpa melebarkan halaman, pagination dapat membungkus, dan tabel mempertahankan scroll horizontal lokal dengan petunjuk serta fokus keyboard.
- Dropdown dibatasi area viewport, dapat membuka ke atas dengan jarak yang tepat, dan navigasi keyboard melewati opsi nonaktif. Filter departemen/frekuensi memiliki nama aksesibel eksplisit.
- Tautan lewati navigasi menuju main content, nama landmark navigasi, isi dialog yang dapat difokuskan/di-scroll dengan keyboard, tombol tutup 44px, dan penguncian scroll halaman saat dialog terbuka.
- Login memakai safe center sehingga isi tetap dapat digulir pada layar pendek. Input mobile memakai 16px untuk menghindari zoom otomatis pada perangkat yang menerapkannya. Lebar maksimum konten desktop/ultrawide dipertahankan.

## Verifikasi

Playwright dengan Chrome headless, server lokal dan respons API sintetis. Semua mutasi API diblokir; tidak ada inference atau perubahan data historis.

Hasil akhir: build, lint, Pint, dan 72 tes PHP (2.729 assertions) lulus. Audit normal dan teks panjang masing-masing lulus 56 kombinasi halaman/viewport, tanpa overflow halaman, clipping pada kontrol/judul yang diperiksa, error JavaScript, atau mutasi API. Interaksi kelima tampilan hasil, dropdown/keyboard, dialog dan layar login pendek juga lulus. Seluruh 144 skenario header serta regresi navigasi dan Overview/Q&A lulus.

| Viewport | Tinggi pengujian responsif |
| --- | --- |
| 320 | 844 |
| 375 | 812 |
| 390 | 844 |
| 768 | 1024 |
| 1024 | 768 |
| 1366 | 768 |
| 1920 | 1080 |
| 2560 | 1440 |

Halaman: login, Overview, Import, Data aktivitas, Analisis AI, Hasil analisis, Pusat Bantuan. Pemeriksaan mencakup overflow/clipping, screenshot, pemilih periode/dataset, filter, pagination, validasi file, lima tampilan hasil, dialog/fokus/Escape, Q&A, konfirmasi logout yang dibatalkan, serta tautan lewati navigasi. Fixture tambahan memakai nama workbook, aktivitas, dan karyawan yang panjang. Login juga diuji pada 568×320, 844×390 dan 1366×768.

Perintah yang dapat dijalankan ulang:

```powershell
npm --prefix frontend run build
npm --prefix frontend run lint
php artisan test --compact
php vendor/bin/pint --test
node scripts/review-responsive.mjs
node scripts/review-responsive.mjs --stress
node scripts/review-header-loading.mjs
node scripts/review-analysis-navigation.mjs
node scripts/review-overview-qna.mjs
```

Screenshot dan `audit.json` tersimpan di `storage/framework/testing/responsive/` dan `storage/framework/testing/responsive-stress/`. Tes header mengukur geometri header, judul, dataset dan area aksi saat buka awal, refresh, serta navigasi pada delapan viewport (144 skenario). Screenshot normal dan dialog dengan teks panjang ditinjau secara visual; susunan desktop dan pembatasan lebar ultrawide tetap dipertahankan.

Pemeriksaan aksesibilitas ini bersifat dasar, bukan sertifikasi WCAG atau pengujian screen reader. Browser yang diuji adalah Chrome; perilaku Safari/Firefox dan perangkat fisik belum diverifikasi. Auth/API/business logic/database tidak diubah; tidak ada commit atau push.
