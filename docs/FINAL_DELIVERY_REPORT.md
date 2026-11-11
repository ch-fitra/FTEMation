# FTEMation — Laporan perbaikan audit dan pengumpulan

11 November 2026. Working tree awal bersih; temuan D1/D2 masih berlaku. Tidak ada commit/push, migration/reset database, perubahan env, inference berbayar baru, atau upload/sharing. Semua tes mutasi memakai SQLite in-memory.

## 1. Implemented fixes

| Finding | Perubahan | Lokasi |
|---|---|---|
| D1 High | 40 attempts untuk release contention, maxExceptions=1 untuk fatal failure, failed callback memakai lock; hasil sukses dipertahankan | app/Jobs/AnalyzeWorkloadRun.php; tests/Feature/AnalysisTest.php |
| D2 Medium | FTE/departemen/saving/remaining/metode menggunakan snapshot completed run terbaru; status latest tetap terpisah; baseline aktif bila belum ada completed run | app/Services/Workload/WorkloadSummaryService.php |
| D3 | Rubrik eksplisit High/Medium/Low, lima faktor, scope/effort/oversight/taksonomi, rumus, saving, priority, snapshot dan batas AI | README.md; docs/METHODOLOGY.md |
| D4 | Saving label memformat rate dari report.calculation; tidak ada perhitungan saving di React | frontend/src/pages/AnalysisPage.tsx; types/analysis.ts |
| D5 | Pemeriksaan env/secrets, auth/ownership/upload/formula injection; production guide tanpa mengubah development env | README.md; AnalysisTest.php; verify-delivery.php |
| D6 | Overview no import/baseline/queued/processing/failed/partial/completed; status, level counts, remaining dan link analisis | OverviewPage.tsx; types/workload.ts |

## 2. Regression testing

Perilaku lama diuji sementara dengan source kemudian dipulihkan otomatis (try/finally), hanya pada database test. D1: original tries=1, worker reservasi pertama me-release saat lock held, lock dilepas, waktu maju 16 detik; reservasi kedua menjadi partial_failed, seharusnya processing. D2: original summary dan kapasitas aktif dua kali snapshot; Overview=2.23359375, report=4.4671875000000005. Kedua regresi benar-benar gagal sebelum fix dan lulus setelah fix. Log sebelum fix berada privat pada storage/app/private/regression-d1-before.txt dan regression-d2-before.txt.

Tes permanen pada AnalysisTest:

- `test_database_worker_retries_lock_contention_without_repeating_successes`: real database queue + Worker SQLite, requeue setelah release, akhirnya 60 selesai; hasil sukses awal attempts tetap sama.
- `test_fatal_worker_failure_preserves_success_and_stops_after_one_exception`: fatal exception langsung partial_failed, 5 sukses tetap, 55 gagal, tidak ada job tertinggal.
- `test_second_worker_cannot_enter_batch_while_first_provider_request_is_in_flight`: interleaving deterministik saat request provider fake berlangsung; worker kedua release, satu request/batch.
- `test_contention_has_a_finite_database_queue_attempt_budget`: attempt ke-41 berhenti, callback tidak mengubah run yang locked, stale dapat retry manual.
- `test_exhausted_duplicate_cannot_fail_locked_or_completed_run`: callback duplicate tidak merusak run aktif/selesai.
- `test_summary_uses_latest_completed_snapshot_even_when_new_run_is_processing`: baseline, satu completed, perubahan kapasitas/saving, beberapa snapshot completed, latest processing; total/departemen/saving/remaining/metode sama dengan report.

Tes retry/cache/summary failure yang sudah ada tetap lulus. Interleaving deterministik bukan klaim stress test multiproses OS.

## 3. Overall testing

| Pemeriksaan dijalankan | Hasil |
|---|---|
| PHPUnit seluruh suite, SQLite in-memory | 58 tests / 413 assertions PASS (baseline 52 / 319) |
| Pint --test | PASS |
| Composer validate --no-check-publish | PASS |
| Composer check-platform-reqs | PASS; PHP 8.4.26 |
| TypeScript + Vite production build | PASS; 105 modules |
| Frontend oxlint | PASS |
| Smoke HTTP tanpa import baru | 33 checks PASS |
| Browser analysis existing | 15 checks PASS |
| Browser responsive existing | 48 checks PASS, 0 runtime errors |
| Browser audit fixes | 18 checks PASS, 0 runtime errors |
| git diff --check | PASS; pemberitahuan normalisasi CRLF README saja |
| Database connection | PASS; MariaDB 10.4.32 |
| Export aplikasi run #1 | JSON/XLSX/PDF PASS |
| Secret value scan | 164 files source/build/log; 2 nilai key lokal diperiksa; 0 hit; env tidak tracked dan diabaikan Git |

Total browser sesi ini 81 pemeriksaan (15+48+18). Baseline audit 183 pemeriksaan menggunakan cakupan/skrip berbeda; tidak diklaim 183 dijalankan ulang. Dua belas tes audit ad hoc tidak tersedia sebagai suite tersimpan; enam tes permanen ditambahkan untuk temuan dan lifecycle terkait. Provider seluruh tes palsu. Bukti screenshot/checks tersimpan privat di storage/app/private/ui-review/.

## 4. AI verification

Run #1 tetap completed, 13 request, actual_model deepseek-flash, 28171 input/14891 output tokens. Run #2 dan #3 completed cache, nol request. Fingerprint SHA-256 seluruh atribut run dan activity analyses identik pada pemeriksaan sebelum/sesudah tahap akhir. Tidak ada klasifikasi, grouping, snapshot atau hasil lama yang ditulis ulang. Nilai baseline run #1 cocok dengan laporan fase sebelumnya. Fingerprint tahap akhir tidak diklaim sebagai hash historis audit karena audit tidak menyertakan hash tersebut.

Review rinci input asli, output tersimpan, referensi, alasan disagreement dan rekomendasi ada di AI_VERIFICATION.md. ACT-0002 three-way matching belum didukung ketersediaan goods receipt; domain review wajib sebelum penerapan. ACT-0002/0007 berbeda karena proporsi exception tidak diketahui. ACT-0009/0039 menunjukkan ambiguitas label pasangan terhadap mekanisme dominan. Prompt lama tetap; tidak ada inference ulang atau label replacement.

## 5. Dashboard dan export

ACT-0001=0.1875; total internal=4.4671875000000005; saving=1.6724791666666663; remaining=2.7947083333333342. Distribusi 21/24/15. Selisih digit floating-point terhadap 4.4671875 berada di toleransi 1e-12, bukan perubahan bisnis. Export membulatkan enam desimal: total 4.467188 dan saving 1.672479.

60 activity_id unik; 20 grup; setiap aktivitas tepat sekali pada grouping dan export. Workbook enam sheet/60 baris data Activities, tidak ada sel formula. PDF 29 halaman; teks ACT-0001/0060 dan total ditemukan; halaman 1,15,29 dirender dan diperiksa. ERD PNG/PDF lengkap dan terbaca pada zoom. UI Overview dan Analysis diuji pada 320,390,768,1440,1920 tanpa overflow horizontal; state gagal/proses/baseline/no-import serta label nondefault 55/25/5 diuji lewat response fixture browser, bukan perubahan database.

## 6. Submission deliverables

Folder submission/ diabaikan Git. Source ZIP dibangun dari allowlist source, env contoh, migration/seeder/prompt/tests/docs/references/samples dan placeholder direktori runtime; excludes env aktual, dependency, cache, log, upload privat, session, database dump. Dataset, ERD PNG/PDF, export nyata JSON/XLSX/PDF, README, metodologi, review AI, checklist, naskah target 9:30 dan laporan disediakan terpisah. MANIFEST mencatat SHA-256 dan validasi ZIP. Instalasi dependency pada komputer kosong belum dijalankan; petunjuk/setup/lock/platform diverifikasi lokal. Browser review scripts memerlukan Playwright terpisah sebagaimana environment review lokal, tidak diperlukan untuk menjalankan aplikasi.

## 7. Assessment readiness

Matriks seluruh requirement asli beserta bukti ada pada SUBMISSION_CHECKLIST.md. Fitur wajib aplikasi dan artefak data/source PASS. Video PARTIAL (naskah siap, belum direkam); Drive upload PARTIAL; izin Viewer publik NOT TESTED. Flutter opsional tidak dikerjakan.

## 8. Remaining issues

- P0 pengumpulan: pengguna perlu merekam video bersuara 8–10 menit; upload satu folder Drive dan uji link Viewer setelah izin. Tidak dilakukan otomatis sesuai instruksi.
- P1 semantik: domain reviewer mengonfirmasi exception ratio ACT-0002/0007 dan prasyarat three-way matching; output historis tidak diubah. Usulan prompt baru dicatat, belum diaktifkan.
- P1 deployment: MySQL 8/hosting HTTPS, stress multiworker dan kill/recovery proses OS belum diuji. Timeout keras Linux PCNTL penting untuk menjaga timeout 360 < lock 400 < retry_after 420. Windows tidak menjamin penghentian job saat TTL.
- P1 reliability boundary: tidak ada transaksi exactly-once lintas DeepSeek dan DB jika OS mati setelah respons sebelum persistence. Hasil sukses/cache mencegah pengulangan normal; stale recovery manual dapat membutuhkan request ulang pada failure window tersebut.
- P2 distribusi: instalasi bersih tidak memuat database pengguna/run lama; export nyata disertakan terpisah. Pengguna baru perlu import/inference terotorisasi untuk menghasilkan run UI sendiri.

## 9. Final verdict

**NOT READY untuk pengumpulan lengkap** sampai video wajib direkam dan folder Drive dikirim dengan akses sesuai assessment. Perbaikan D1–D6 serta paket aplikasi lokal telah terverifikasi; tidak ada bug D1/D2 yang masih dapat direproduksi pada regression suite. Jangan menyamakan aplikasi lokal yang lulus pengujian dengan seluruh deliverable eksternal sudah diserahkan.
