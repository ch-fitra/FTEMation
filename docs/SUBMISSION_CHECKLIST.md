# Checklist pengumpulan FTEMation

Sumber requirement: `references/Studi Kasus AI Insight.pdf` (dibaca kembali 11 November 2026). PASS berarti ada bukti lokal; PARTIAL berarti ada pekerjaan manual tersisa. Tidak ada upload atau perubahan sharing pada sesi ini.

| Requirement asli | Status | Bukti / tindakan |
|---|---|---|
| Laravel 13 terhubung layanan AI | PASS | Laravel 13; run #1 actual_model deepseek-flash, 13 request tersimpan |
| Login, akun demo pada README | PASS | Session/CSRF, tes auth dan smoke; akun demo sintetis terdokumentasi |
| Import Excel dataset buatan sendiri | PASS | Workload 60 aktivitas, 12 karyawan, 3 departemen, sembilan kolom |
| Minimal 50 aktivitas / 10 karyawan / 3 departemen | PASS | Workbook referensi dan acceptance tests |
| Aktivitas mirip untuk grouping | PASS | Taksonomi 20 kategori dan grouping lintas departemen |
| Rumus FTE pada README | PASS | Deterministik, ACT-0001=0.1875, total=4.4671875 |
| Level, alasan dan rekomendasi per aktivitas | PASS | 60 success pada completed run nyata; review semantik didokumentasikan |
| Kesimpulan, saving dan prioritas per karyawan/departemen | PASS | 12 ringkasan karyawan / 3 departemen; report dan tes |
| Dashboard total FTE, potensi, departemen, detail | PASS | UI browser, completed snapshot konsisten |
| Grouping dan total FTE kelompok | PASS | 60 anggota unik, satu kelompok/aktivitas, agregat sesuai report |
| Export PDF/Excel/results.json | PASS | Export aplikasi run #1; validasi struktur dan angka; PDF 29 halaman |
| Output AI terstruktur, tervalidasi, konsisten | PASS | Enum/ID/shape/oversight, cache, validator; semantic ambiguity tetap perlu review manusia |
| API failure, retry, cache | PASS | Tes provider palsu, worker database SQLite, cache tersimpan run #2/#3 |
| Prompt file terpisah, rubrik dan model di README | PASS | activity-v1/summary-v1; metodologi README |
| results.json seluruh aktivitas, ID unik, field wajib dan status | PASS | 60 ID; seluruh status success; FTE/saving dari aplikasi |
| Source code ZIP dan panduan menjalankan | PASS | FTEMation-source.zip; README; env contoh; dependencies/runtime dikecualikan |
| Dataset Excel pengumpulan | PASS | FTEMation_Workload_Dataset_v1.xlsx |
| ERD gambar atau PDF | PASS | FTEMation_ERD.png dan FTEMation_ERD.pdf |
| Video 8–10 menit dengan penjelasan suara | PARTIAL | Naskah/storyboard target 9:30 tersedia; pengguna perlu merekam dan memeriksa durasi/audio |
| Semua file dalam satu folder Google Drive | PARTIAL | Paket lokal siap; belum diunggah sesuai instruksi pengguna |
| Anyone with the link – Viewer, bisa dibuka tanpa izin | NOT TESTED | Atur dan uji incognito setelah pengguna mengotorisasi upload/sharing |
| Flutter | NOT TESTED | Nilai plus opsional, ditunda; bukan penghalang assessment wajib |

## Isi folder submission

- `FTEMation-source.zip`: source terpilih; bukan dump seluruh workspace.
- `FTEMation_Workload_Dataset_v1.xlsx`: input referensi.
- `FTEMation_ERD.png`, `FTEMation_ERD.pdf`: diagram tujuh tabel domain.
- `results.json`, `FTEMation.xlsx`, `FTEMation.pdf`: export aplikasi completed run #1 nyata.
- `README.md`, `METHODOLOGY.md`, `AI_VERIFICATION.md`: panduan, rumus/rubrik dan review perbedaan AI.
- `SUBMISSION_CHECKLIST.md`, `DEMO_STORYBOARD.md`, `FINAL_DELIVERY_REPORT.md`: status, naskah, bukti perbaikan.
- `MANIFEST.json`: ukuran dan SHA-256 artefak; daftar/hasil validasi ZIP.

Source ZIP tidak berisi hasil inference tersimpan atau database. Pada instalasi bersih, hasil demonstrasi dapat ditinjau pada export terpisah; UI baru memiliki data setelah import dan inference yang diotorisasi. Jangan menjanjikan completed run #1 otomatis tersedia setelah setup baru tanpa database lokal.

## Langkah manual terakhir

1. Rekam video sesuai storyboard; verifikasi 8–10 menit, suara terdengar, tidak ada secret di layar.
2. Tambahkan video ke paket, lalu perbarui manifest bila diperlukan.
3. Setelah izin upload, unggah semua file wajib ke satu folder Drive. Set Viewer untuk anyone with link dan uji tautan tanpa login sebelum mengirim ke HR/IT.
4. Jika mempublikasikan aplikasi, ganti password demo dan jalankan checklist production README; jangan memakai root XAMPP. Hosting/MySQL 8/HTTPS aktual belum diuji.
