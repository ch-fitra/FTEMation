# FTEMation — Laporan implementasi analisis AI

Tanggal: 11 November 2026. Melanjutkan fondasi yang ada tanpa reset database atau mengganti arsitektur tujuh tabel domain.

## Yang diimplementasikan

- DeepSeek Flash melalui Laravel HTTP Client, JSON mode, `thinking.type=disabled`; prompt aktivitas dan kesimpulan terpisah serta versioned.
- Penilaian High/Medium/Low, alasan, rekomendasi, lima faktor, risiko, effort, scope, dan human oversight. Validator menolak ID/kategori/enum/struktur yang salah serta pelanggaran kebijakan oversight.
- Database queue: batch lima aktivitas, lock per run, start idempoten, retry HTTP terbatas, retry aktivitas gagal tanpa mengulang hasil sukses, heartbeat dan pemulihan antrean yang berhenti.
- Cache hasil tervalidasi per pemilik, fingerprint konten/model/prompt/taksonomi, perhitungan ulang saving, cache kesimpulan berdasarkan agregat. API key tidak masuk snapshot maupun respons API.
- Grouping dua puluh kategori tetap, agregat lintas departemen, kesimpulan seluruh karyawan/departemen, ranking dan tiga prioritas teratas per entitas.
- Dashboard saving dan halaman Analisis AI dengan riwayat, progres, filter, detail, grouping, kesimpulan, serta export.
- PDF DomPDF, workbook PhpSpreadsheet enam sheet, dan results.json. Export final hanya dari run lengkap. Excel menyimpan teks sebagai literal untuk mencegah formula injection.
- Asumsi FTE pada frontend berasal dari metadata API Laravel.

## Inference riil

Dataset import #1: 60 aktivitas, 12 karyawan, 3 departemen. Run #1 selesai melalui 13 request riil DeepSeek; model respons `deepseek-flash`, 28.171 input token, 14.891 output token. Semua aktivitas success dan seluruh kesimpulan lengkap. Tidak memakai Http::fake pada proses ini.

| Hasil | Nilai |
|---|---:|
| Total FTE internal | 4.4671875 |
| ACT-0001 | 0.1875 |
| High / Medium / Low | 21 / 24 / 15 |
| Estimated saving internal | 1.6724791666666663 |
| Remaining FTE internal | 2.7947083333333342 |
| Kategori terpakai | 20 |
| Aktivitas dengan oversight | 52 |

ACT-0020, ACT-0038, ACT-0060 dinilai Low dan membutuhkan oversight. Angka saving merupakan estimasi baseline, bukan realisasi penghematan atau keputusan pengurangan pegawai.

Run #2 selesai dengan enam puluh cache hit, tanpa request AI tambahan; kesimpulan juga berasal dari cache. Kedua run tersedia di riwayat UI. Run cache tidak melaporkan token inference baru.

Hasil riil aplikasi disimpan privat pada `storage/app/private/exports/run-1/`: `results.json`, `FTEMation.xlsx`, `FTEMation.pdf`. PDF berisi 29 halaman; halaman awal, tengah, akhir telah dirender dan diperiksa visual. Workbook mempunyai enam sheet dan enam puluh baris aktivitas, tanpa sel formula. Download melalui browser juga berhasil untuk ketiga format.

## Evaluasi terpisah dari inference

Label workbook evaluasi tidak diberikan kepada provider. Perbandingan setelah inference:

- Level otomatisasi: 13 dari 15 sesuai referensi.
- Kategori: 15 dari 15 sesuai referensi.
- Relasi pasangan grouping: 15 dari 16 sesuai referensi.
- ACT-0002 dan ACT-0007 dinilai High oleh model, sementara referensi Medium. Penilaian model perlu review domain, khususnya batas otomatisasi validasi dan rekonsiliasi serta penanganan exception. Hasil tidak ditimpa dengan label evaluasi.

## Pengujian

PHPUnit menggunakan SQLite in-memory, dengan provider palsu khusus pengujian; inference di atas menggunakan MySQL/MariaDB dan provider nyata. Tes mencakup pipeline lengkap, acceptance FTE, kontrol pemilik, penolakan export parsial, cache, perubahan asumsi, retry batch, retry kesimpulan, JSON invalid/terpotong, error autentikasi provider, kategori/ID asing, oversight, dan formula injection Excel.

Pemeriksaan browser `scripts/review-analysis.mjs`: 15 pemeriksaan lulus, mencakup seluruh tab, filter, download JSON/Excel/PDF, refresh URL, serta lebar 320/390/768/1440 px tanpa overflow halaman. Pemeriksaan UI fondasi `scripts/review-ui.mjs`: 37 pemeriksaan, nol runtime error. Screenshot dan download pemeriksaan berada di `storage/app/private/ui-review/`.

Verifikasi akhir yang dijalankan:

| Perintah / pemeriksaan | Hasil |
|---|---|
| `php artisan migrate --force` | Migration metadata berhasil pada ftemation; tidak reset data |
| `php artisan test --compact` | 52 tes / 319 assertions lulus |
| `php vendor/bin/pint --test` | Lulus |
| `npm --prefix frontend run build` | Lulus |
| `npm --prefix frontend run lint` | Lulus |
| `node scripts/smoke-http.mjs` | 33 pemeriksaan HTTP lulus |
| `node scripts/review-ui.mjs` | 37 pemeriksaan, nol runtime error |
| `node scripts/review-analysis.mjs` | 15 pemeriksaan lulus setelah perbaikan overflow tombol export mobile |
| `php artisan workload:export 1` | Ketiga export berhasil dibuat dari run riil lengkap |
| `git diff --check` | Tidak ada whitespace error; ada pemberitahuan normalisasi CRLF Windows |

Worker analysis telah dinyalakan di latar belakang untuk sesi pengembangan lokal. Setelah komputer/server restart, jalankan kembali perintah worker pada README.

## Peta perubahan

- `app/Services/Analysis/`: provider, validator, exception, orkestrasi, canonical report, export.
- `app/Jobs/AnalyzeWorkloadRun.php`, `app/Console/Commands/`: worker dan perintah analisis/export lokal.
- `app/Http/Controllers/AnalysisController.php`, `routes/`: API dengan Sanctum dan ownership.
- Migration `2026_11_11_000003_*`, model analisis, konfigurasi AI/queue: metadata eksekusi tanpa tabel domain tambahan.
- `resources/prompts/`, `resources/views/reports/`: prompt dan template PDF.
- `frontend/src/pages/AnalysisPage.tsx`, types/CSS/navigasi/layout: UI hasil; Overview/Activities memakai metadata dan ringkasan baru.
- `tests/Feature/AnalysisTest.php`, routing test, skrip review/smoke: pengujian alur baru.
- `.env.example`, README, DEVELOPMENT, ROADMAP, ERD: dokumentasi cara menjalankan dan batasan.
- `docs/ERD_v1.mmd` dan PNG hasil render diperbarui untuk username serta metadata eksekusi analisis.
- `.env` lokal hanya ditambah path CA bundle tepercaya; key/model pengguna dipertahankan.

## Batasan dan pekerjaan pengumpulan

- Kualitas semantik AI tetap membutuhkan tinjauan manusia; validasi struktur dan oversight bukan jaminan semua klasifikasi benar. Evaluasi di atas hanya lima belas label referensi, bukan estimasi akurasi untuk semua proses perusahaan.
- Pengujian aplikasi nyata menggunakan MariaDB 10.4.32 XAMPP melalui driver mysql. MySQL 8 dan hosting produksi belum diuji.
- Belum melakukan uji beban multiworker atau pemutusan paksa proses OS. Start idempoten/lock/heartbeat tersedia; worker wajib berjalan untuk memproses antrean.
- Video demo bersuara 8–10 menit, paket ZIP pengumpulan, dan pengunggahan Drive belum dikerjakan. Source tidak dipush atau dipublikasikan dalam pekerjaan ini.
- What-If, Flutter, dan fitur opsional tetap tidak dikerjakan.
