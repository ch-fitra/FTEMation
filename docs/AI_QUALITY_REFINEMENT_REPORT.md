# AI Quality Refinement & Professional Reporting

Tanggal pemeriksaan: 11 November 2026 (Asia/Jakarta).

Implementasi selesai dengan pengujian offline, tanpa inference DeepSeek, migration, reset database, perubahan hasil historis, commit, push atau publikasi. Aplikasi tidak dibangun ulang. Perubahan pengguna yang sudah ada pada working tree dipertahankan.

## A. Perubahan kode

| File / fungsi | Perubahan dan alasan |
|---|---|
| `resources/prompts/activity-v2.txt` | Batas bukti, prasyarat bersyarat, rubrik konsistensi dan makna oversight |
| `resources/prompts/summary-v2.txt` | Membatasi asumsi baru pada narasi karyawan/departemen |
| `config/ftemation.php` | Default start baru ke activity-v2 / summary-v2 |
| `app/Services/Analysis/ConsistencyReview.php::candidates` | Advisory grup dengan level berbeda; mempertahankan alasan/faktor asli |
| `app/Http/Controllers/AnalysisController.php::show` | Field tambahan consistency_review di luar report JSON final |
| `app/Services/Analysis/ReportGuidance.php` | Teks penjelasan kontrol manusia dan workload |
| `app/Services/Analysis/AnalysisExportService.php::overview` | Overview eksekutif, metadata, KPI, distribusi, catatan dan format |
| `app/Services/Workload/WorkloadSummaryService.php::summarize` | Catatan informatif individu di atas satu FTE dari calculation snapshot |
| `frontend/src/pages/AnalysisPage.tsx`, `frontend/src/types/analysis.ts` | Advisory, penjelasan boolean, catatan kartu karyawan; mempertahankan revisi UI pengguna |
| `resources/views/reports/analysis.blade.php` | Penjelasan oversight dan FTE di atas satu pada PDF |
| `tests/Feature/AnalysisTest.php` | Lima tes tambahan untuk versioning, pasangan sintetis, kontrol manusia, export, dan workload |
| `scripts/verify-analysis-history.php` | Hash read-only tabel domain, report tiap completed run dan artefak export tersimpan |
| `scripts/review-quality-exports.php` | Preview dari completed run tanpa menimpa export historis; perbandingan data dan formula |
| `scripts/review-ai-quality.mjs` | Browser read-only pada Run #4, memblokir mutasi workload/analisis |
| `scripts/smoke-http.mjs` | Memilih fixture 60 aktivitas untuk acceptance reference meskipun dataset 90 aktivitas lebih baru |
| `README.md`, `docs/METHODOLOGY.md`, `docs/AI_VERIFICATION.md` | Perilaku baru, metode, reproduksi, dan batas bukti |

`AiOutputValidator`, `AnalysisRunService`, `AnalysisReportService` dan `DeepSeekClient` diperiksa. Mekanisme snapshot/cache, kontrak validator, dan perhitungan yang sudah ada cukup untuk perubahan ini sehingga tidak ditulis ulang. Tidak ada perubahan schema database maupun field wajib results.json.

Sumber assessment PDF, ekstraksi teks, PRD dan keputusan stack dibaca dari starter kit yang sudah tersedia. `references/` dan dokumen historis METHODOLOGY, AI_VERIFICATION, FINAL_DELIVERY_REPORT tidak tersedia di lokasi yang diminta; direktori arsip saudara yang disebut AGENTS/README juga tidak ditemukan. METHODOLOGY dan AI_VERIFICATION baru menjelaskan implementasi aktif, bukan rekonstruksi laporan historis. Starter kit tidak disalin ulang atau dihapus.

## B. Prompt v2

V1 tetap utuh. V2 melarang klaim dokumen, field, sistem, API, SOP, threshold, toleransi dan integrasi yang belum dibuktikan. Rekomendasi bertahap menggunakan input tersedia; tambahan teknologi dinyatakan sebagai opsi dengan prasyarat. Invoice dan PO mendukung two-way matching; three-way memerlukan konfirmasi penerimaan barang. Saving tetap estimasi aplikasi, belum bukti operasional.

Rubrik mempertimbangkan langkah yang bisa diotomatisasi, exception, judgment, risiko dan kualitas input. Alasan menjelaskan pembeda yang benar-benar disebutkan. Informasi kurang ditandai untuk review pemilik proses. Tidak ada target distribusi kelas untuk run baru.

Summary v2 mengikuti aturan bukti yang sama dan tidak memperlakukan rekomendasi aktivitas sebagai bukti kesiapan sistem. Tidak ada field AI tambahan. Fingerprint lama sudah mencakup teks kedua prompt; tes membuktikan versi baru menghasilkan fingerprint berbeda dan tidak memakai cache v1. Retry/resume run lama tetap memakai snapshot aslinya.

## C. Konsistensi dan oversight

Lima pasangan referensi sintetis lulus fake-provider contract: Finance/Procurement invoice, input data lintas departemen, laporan/investigasi, administrasi/persetujuan pembayaran, dan pekerjaan rutin/keputusan strategis. Label dibuat untuk menguji rubrik dan pipeline; bukan ground truth ahli domain atau hasil prediksi DeepSeek.

Advisory menemukan delapan grup dengan level berbeda pada Run #4, termasuk data_reconciliation dengan ACT-1002 dan ACT-1036. Ini kandidat pembandingan alasan, bukan delapan kesalahan. Tidak ada label/group/FTE/saving yang diganti. Kandidat hanya berbasis grup dan variasi level; bukan pemeriksaan semantic similarity atau bukti bahwa perbedaannya benar/salah.

UI, PDF dan Overview membedakan persetujuan rutin setiap transaksi, review pengecualian, dan kewenangan keputusan final. Boolean lama tetap kompatibel. False dijelaskan sebagai “tidak diwajibkan oleh label AI; bukan jaminan tanpa manusia”, disertai rekomendasi asli dan permintaan konfirmasi pemicu/peran. Jenis kontrol tidak diklaim dapat ditentukan pasti dari teks bebas.

Tes kebijakan mempertahankan kewajiban kontrol untuk faktor risiko/judgment tinggi dan high_impact_decision pada empat skenario finansial, rekening, rekrutmen dan keselamatan. FAQ exception-only tetap dapat false. Browser memeriksa kelima kasus audit ACT-1038/1062/1063/1068/1071 dan memastikan rekomendasi aslinya tampil utuh. Enam catatan individu di atas satu FTE juga terverifikasi; formula dan nilai tidak dibatasi.

## D. Excel dan PDF

Overview memakai header navy, aksen cyan, metadata run/model/prompt/tanggal Asia/Jakarta, KPI kapasitas, distribusi High/Medium/Low serta proporsi, jumlah kontrol wajib dan panduan interpretasi. Tidak ada objek JSON di Overview. Enam sheet tetap berurutan: Overview, Employees, Departments, Groups, Activities, Assumptions. Tabel detail tetap memiliki freeze pane/filter dan format angka; Activities mempertahankan seluruh kolom/nilai.

Preview dibuat oleh aplikasi dari Run #4 ke `storage/framework/testing/quality/`, terpisah dari export historis. PhpSpreadsheet berhasil membuka kembali workbook; 2.340 sel Activities cocok dengan JSON aplikasi, 90 anggota grup unik, dan rumus FTE/saving diperiksa ulang. ZIP CRC dan seluruh 13 bagian XML valid; tidak ada elemen formula yang dapat dieksekusi. Tes tambahan memastikan formula-like text pada aktivitas maupun model metadata tetap literal.

Overview dirender dengan Artifact Tool dan diperiksa visual: angka, label, persentase dan catatan terbaca. Microsoft Excel desktop belum dipakai untuk mengonfirmasi dialog warning native; validitas parser/XML/render bukan klaim pengujian aplikasi Excel itu sendiri.

PDF preview terbaru berisi 41 halaman akibat tambahan penjelasan, mencakup seluruh ACT-1001 sampai ACT-1090; tidak ada text span di luar halaman. Halaman pertama, sampel karyawan dan halaman terakhir diperiksa visual. Ini tidak mengganti PDF historis 38 halaman yang direview pengguna.

## E. Regression tests

| Pemeriksaan aktual | Hasil |
|---|---|
| Seluruh PHPUnit unit + feature | **65 passed, 2.687 assertions** |
| D1 worker queue contention / retry budget / success preservation | Lulus dalam suite penuh |
| D2 calculation snapshot / latest completed run | Lulus dalam suite penuh |
| Prompt/cache versioning, validator/scope/oversight | Lulus |
| Lima pasangan offline dan advisory tanpa relabel | Lulus |
| Export JSON/XLSX/PDF, field wajib dan ID unik | Lulus |
| Seluruh data Activities Excel vs JSON Run #4 | 2.340 sel cocok |
| FTE/saving Run #4 dan grouping coverage | Lulus untuk 90 aktivitas |
| Laravel Pint --test | Lulus |
| Composer validate --no-check-publish | Valid |
| Composer check-platform-reqs | Semua tersedia |
| Frontend TypeScript + Vite build | Lulus |
| Frontend oxlint | Lulus |
| HTTP smoke tanpa --import | 33 checks lulus |
| Chrome/Playwright | Lima kelompok pemeriksaan lulus; tanpa runtime error atau mutasi workload |
| Responsif browser | 390, 768, 1440 px; tanpa horizontal page overflow |
| git diff --check | Lulus |

Baseline aktual working tree sebelum tes tambahan adalah 60 tes / 425 assertions, karena sudah ada perubahan pengguna dibanding baseline lama 58/413. Ditambahkan lima tes; seluruh tes lama tetap lulus. Tes berbayar tidak dijalankan. Fake-provider tests membuktikan kontrak dan regresi, bukan efektivitas reasoning model v2.

## F. Perlindungan histori

Snapshot sebelum/sesudah identik, disimpan lokal di `storage/framework/testing/quality/history-before.json` dan `history-after.json`. Pemeriksaan mencakup semua kolom pada enam tabel domain terkait (tanpa users/kredensial), setiap report dari empat completed run, serta seluruh enam file yang sudah ada di direktori export run-1. Hash mencakup snapshot prompt, klasifikasi, alasan, rekomendasi, faktor, cache key dan status yang tersimpan. File export Run #2–#4 tidak ditemukan dalam direktori export privat saat baseline; report masing-masing tetap diverifikasi dari database.

| Tabel | Jumlah baris sebelum = sesudah | SHA-256 sebelum = sesudah |
|---|---:|---|
| imports | 3 | 4fe38bf7d53c62aea3c4479261db097f3b0aedfa62dadceb32dc9e995aba09f0 |
| employees | 30 | 5bc760c2a825734507c9c69aaa87eba675cc6fa67da8dc9ad1af9b90b148991a |
| activities | 150 | d0af9d0b87916589075a6c5967895c1c708c034acf46aac97e74b6b213494fb2 |
| activity_groups | 20 | 767883a706c68bb50ab4c83c47e3be72f50eba8be2f09f61ef245516f11016db |
| analysis_runs | 4 | 5db2472e61e2fc68a7a37dd44c11dd1241c51437f343b3359d6ffe7f428f5058 |
| activity_analyses | 270 | 3bea426a2c4257a916728e1d3fde545b77f15979ed6ae7961d0b987fd40ad01f |

Run #1–#3 tetap activity-v1, masing-masing 60 aktivitas/12 karyawan/3 departemen, total 4.4671875 FTE, saving 1.6724791667, level 21/24/15. Run #4 tetap activity-v1, 90/18/6, 20 grup, total **16.1646875**, saving **5.7640520833**, remaining **10.4006354167**, level **29/28/33**, oversight true **76**. Selisih representasi float terakhir hanya presisi mesin; angka export dibulatkan enam desimal.

## G. Keterbatasan tersisa

Efektivitas DeepSeek v2 pada inference nyata belum diuji. Validasi struktur tidak mendeteksi semua unsupported assumptions, konflik rekomendasi/oversight atau kesalahan faktor risiko. Label referensi offline belum divalidasi ahli domain. Review prasyarat proses dan kewenangan manusia tetap diperlukan. Advisory tidak membandingkan lintas kategori dan tidak menangkap semua kesalahan pada label yang sama.

Native Excel warning dan production deployment belum diuji. Penyimpanan password teks biasa yang sudah ada pada working tree merupakan risiko production di luar lingkup penyempurnaan ini; tidak diubah. Penilaian layak demo tidak berarti siap produksi.

## H. Penilaian akhir

Penyempurnaan layak untuk presentasi lokal Tancorp: perhitungan/histori terjaga, alasan lebih mudah direview, oversight lebih jelas, dan laporan eksekutif terbaca. Presentasikan v2 sebagai perbaikan instruksi dan mekanisme evaluasi yang sudah diuji secara offline, bukan klaim peningkatan akurasi model yang telah terbukti. Temuan reasoning pada Run #4 tetap merupakan bukti historis dan tidak dikoreksi manual.

## I. Reproduksi dan langkah manual

```powershell
php artisan test --compact
php vendor/bin/pint --test
composer validate --no-check-publish
composer check-platform-reqs
npm --prefix frontend run build
npm --prefix frontend run lint
node scripts/smoke-http.mjs
php scripts/review-quality-exports.php 4
node scripts/review-ai-quality.mjs
php scripts/verify-analysis-history.php
```

Smoke/browser memerlukan server lokal; Playwright memakai dependency review pada temporary folder dan Chrome yang tersedia. Untuk audit baru, rekam output history sebelum dan sesudah, bukan membandingkan dengan hash jika pengguna memang sudah mengubah dataset setelah laporan ini. Jangan jalankan worker/inference hanya untuk pemeriksaan report.

Sebelum run v2 yang kelak diotorisasi: clear config cache bila digunakan dan restart worker. Otorisasi biaya serta review ahli domain harus dilakukan terpisah; jangan mengubah hasil v1.

Rekam video demo bersuara delapan sampai sepuluh menit: import, metode FTE, hasil referensi 60 aktivitas, grouping lintas departemen, alasan/oversight, Overview Excel, dan bukti uji alternatif 90 aktivitas. Gunakan dataset utama serta results.json referensi 60 aktivitas untuk pengumpulan. Siapkan source ZIP tanpa env/secret/upload privat, README, workbook utama, ERD, video dan JSON aplikasi. Unggah manual ke satu folder Google Drive, set Anyone with the link – Viewer, lalu uji akses incognito. Tidak ada unggahan/publikasi dilakukan dalam pekerjaan ini.
