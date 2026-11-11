# UI/UX refinement report

Tanggal: 11 November 2026. Implementasi langsung pada source FTEMation. Tidak ada commit/push, inference nyata, perubahan konfigurasi saving, penghapusan run, atau mutasi dataset pengguna. HTTP smoke menggunakan login/logout sesi lokal; backend tests memakai SQLite in-memory dan fake provider.

## Masalah dan perubahan

| Area | Sebelum | Sesudah |
|---|---|---|
| Overview | Beban kerja dan rumus mendominasi; saving tidak diprioritaskan | Decision Dashboard: empat KPI, CTA sesuai ketersediaan hasil, tiga peluang backend, perbandingan departemen, rumus dalam disclosure |
| Konteks | Dataset dipilih melalui riwayat import | Selector di setiap halaman, identitas file/ID/count/run, URL dataset dipertahankan sidebar dan detail |
| Analisis selesai | Banner, langkah, status panjang sebelum hasil; rekomendasi memenuhi tabel | Banner ringkas, riwayat disclosure, KPI dan Top 3, tabel ringkas, dialog detail; Analisis Ulang sekunder |
| Analisis berjalan/gagal | Status/progress existing | Persentase, sukses/gagal, informasi proses server; error teknis dalam disclosure dan retry sesuai API |
| Import | Panduan header dan pemilihan file | Template Excel privat, contoh sintetis, keterangan validasi saat import, error Indonesia dengan jumlah dan grouping baris |
| Aktivitas | Search/filter existing | Reset filter, link ke hasil AI, reset state saat dataset berubah, abaikan response aborted |
| Explainability | Penjelasan panjang di tabel | Alasan/faktor/rekomendasi/oversight/grouping di detail; panduan interpretasi dapat dibuka sesuai kebutuhan |

## Design system dan user journey

Navy/cyan, logo, login dan sidebar dipertahankan. Tidak ada framework CSS atau dependency runtime tambahan. Penyesuaian CSS terbatas pada workspace decision, grid peluang, dialog, focus dan reduced motion. Komponen kartu peluang dan dialog dapat dipakai ulang.

Tanpa dataset: empat langkah dan CTA Impor Dataset. Dataset diimpor: jumlah aktivitas/karyawan/departemen, baseline tanpa saving palsu, link periksa data dan lanjut analisis. Processing: status serta progres, tanpa hasil final. Failed: kendala dan retry jika backend mengizinkan. Completed: lihat hasil, tinjau peluang, buka detail, lalu export JSON/XLSX/PDF. Membuka hasil tidak memulai inference; start/retry memiliki konfirmasi biaya layanan tanpa klaim nominal.

Semua KPI dashboard dan prioritas mengambil completed snapshot yang sama. `top_opportunities` dipilih backend dari urutan report `priorities`; React tidak menyortir ulang dan tidak menghitung saving. Status terbaru ditampilkan terpisah dari run sumber hasil. Tautan run historis dapat dimuat meskipun tidak berada dalam 30 riwayat terakhir; respons diverifikasi terhadap dataset aktif.

## Verifikasi otomatis

| Pemeriksaan | Hasil |
|---|---|
| PHPUnit | PASS: 68 tests, 2713 assertions; termasuk export JSON/XLSX/PDF dan ownership |
| Template import | PASS: file download diuji melalui importer sebenarnya; satu aktivitas sintetis diterima |
| Ranking/snapshot dashboard | PASS: tiga ID sesuai urutan report, run ID, saving dan oversight cocok |
| TypeScript + Vite build | PASS |
| Frontend oxlint | PASS tanpa peringatan |
| Laravel Pint | PASS |
| Composer validate | PASS |
| Composer platform requirements | PASS, PHP 8.4.26 |
| HTTP smoke | PASS: 33 checks; tidak memakai flag --import |
| Browser historical Run #4 | PASS: 5 kelompok pemeriksaan, tanpa pageerror/mutasi API |
| Browser audit-fixes existing | PASS: 18 checks, tanpa runtime error |
| Browser UI revisions existing | PASS: 6 kelompok pemeriksaan, termasuk dropdown, drag/drop dan logout |
| Browser isolated | PASS: 17 kelompok pemeriksaan; tidak ada pageerror atau mutasi API |

Skrip `scripts/review-ui-ux.mjs` memakai respons API sintetis, bukan hasil inference. Memeriksa completed KPI/Top 3, tautan detail, fokus awal/Escape, pembatalan konfirmasi analisis ulang, file invalid, baseline/empty/processing/failed, pilihan beberapa run historis, penolakan tautan run lintas dataset, respons dataset lama yang terlambat, navigasi dan reload konteks 90 aktivitas. Screenshot disimpan pada `storage/framework/testing/ui-ux/`, hasil mesin pada `results.json` dalam folder pengujian tersebut; file ini bukan deliverable analisis `results.json` aplikasi.

## Responsive dan accessibility

Diuji pada Chrome headless pada 320, 390, 768, 1024, 1440, dan 1920px. Empat halaman pada setiap ukuran tidak menghasilkan horizontal overflow halaman. Tabel tetap dapat digulir lokal. Screenshot desktop/mobile dialog dan import invalid tersedia. Overview desktop dan analisis mobile ditinjau secara visual.

Fokus awal dialog, Escape dan nama aksesibel diuji; native dialog menyediakan pembatasan fokus. Focus ring, labels, status/alert, semantic headings dan reduced motion tersedia. Belum dilakukan audit menyeluruh WCAG 2.2 AA, pengukuran kontras semua state, atau pembaca layar/perangkat fisik.

## File yang diubah

Backend: ImportController, WorkloadSummaryService, WorkloadWorkbookReader, routes/api.php. Tests: WorkloadImportTest dan AnalysisTest. Frontend: useWorkload, WorkspaceLayout/Sidebar, Overview/Analysis/Activities/Imports, ErrorAlert, kontrak analysis/workload, styles/index.css dan decision.css. Komponen baru: OpportunityCards, ActivityAnalysisDialog. Skrip: review-ui-ux; penyesuaian locator pada review-ai-quality, review-audit-fixes dan review-ui-revisions. Dokumen: README, UI_DESIGN, laporan ini.

## Batasan dan keputusan

- Dokumen PRD/stack/UI/laporan lama tidak ditemukan pada root docs maupun lokasi arsip README; keputusan mengikuti source aktif, README dan instruksi pengguna. Laporan historis tidak diubah.
- Tidak ada pre-import preview jumlah baris; backend memvalidasi seluruh workbook saat import. Template satu contoh belum memenuhi minimum assessment; ganti dengan dataset lengkap untuk presentasi.
- Selector dataset menampilkan halaman riwayat yang sedang dimuat ditambah dataset aktif; dataset lebih lama dapat dibuka melalui pagination Import.
- Daftar riwayat analisis tetap dibatasi API existing 30 run; direct URL run lama tetap didukung.
- Konfirmasi biaya memakai dialog native browser, sehingga tampilannya mengikuti platform.
- Skenario processing/failed/empty dan race memakai fixtures, bukan kegagalan provider nyata. Tidak mengklaim akurasi AI atau inference baru.
- Screenshot before tidak diambil; perbandingan sebelum berdasarkan audit source dan review pengguna. Artefak browser hanya screenshot versi setelah perubahan.
- Skrip historical tetap bergantung pada Run #4 yang tersedia di mesin ini. Pemeriksaan UI revisions menyesuaikan jumlah run aktual; pemilihan beberapa run juga diuji dengan fixtures terisolasi. Percobaan awal skrip lama mengalami timeout karena asumsi dua run dan locator global; setelah penyesuaian, eksekusi akhir lulus.

## Panduan demo HR dan IT Tancorp

1. Buka localhost:8000, login, pilih dataset yang mempunyai completed run.
2. Tunjukkan nama dataset dan sumber run, lalu total workload, estimasi saving dan remaining.
3. Buka peluang pertama; tunjukkan alasan, lima faktor, rekomendasi, risiko, effort dan peran manusia.
4. Tutup detail, bandingkan prioritas/grouping/karyawan/departemen. Jelaskan saving adalah estimasi kapasitas waktu.
5. Unduh hasil completed run; jangan klik start/retry untuk demo read-only.
6. Buka Import dan unduh template, lalu tunjukkan panduan sembilan kolom.
7. Ganti dataset dan tunjukkan konteks yang mengikuti navigasi serta refresh.

Versi build lokal siap dipakai untuk demonstrasi hasil yang sudah tersedia, dengan batas pengujian di atas. Tidak dipublikasikan atau dideploy.
