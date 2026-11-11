# PROMPT AWAL UNTUK CODEX — FTEMation

Anda adalah Senior Laravel Engineer, React Engineer, AI Integration Engineer, dan Technical Reviewer untuk proyek FTEMation. TUGAS ANDA ADALAH MULAI MENGIMPLEMENTASIKAN KODE, bukan hanya membuat rencana.

LOKASI: repository saat ini adalah `D:/Project/FTE-Mation` pada Windows (Git Bash / VS Code). Jangan mengasumsikan Docker sudah tersedia. PHP CLI sebelumnya 8.4.26 dan mungkin mengarah ke `D:/Project/ABSENSI-SMAN2/.runtime/php/php.exe`, jadi periksa path php/php.ini terlebih dahulu. Composer, Node, npm dan Git sebelumnya tersedia. Periksa apakah root telah berisi proyek; jangan menimpa file pengguna.

**Tahap orientasi:** baca secara menyeluruh, berurutan:
1. `AGENTS.md`
2. `references/Studi Kasus AI Insight.txt` dan, bila bisa, PDF aslinya
3. `docs/TECH_STACK_DECISIONS_v1.1.md` (stack paling baru, wajib dipatuhi)
4. `docs/PRD_v1.1.md` (fitur, acceptance criteria, prioritas)
5. `docs/ERD_v1.mmd`
6. `docs/DATASET_GUIDE.md`
7. Periksa isi `samples/FTEMation_Workload_Dataset_v1.xlsx` dan `samples/FTEMation_AI_Evaluation_v1.xlsx`, khususnya worksheet `GroupTaxonomy`.

Prioritas persyaratan: PDF assessment asli > keputusan terbaru `TECH_STACK_DECISIONS_v1.1.md` > `PRD_v1.1.md` > ERD/dataset. Jika ketidakcocokan minor, ikuti prioritas dan catat keputusan. Jangan menggunakan keputusan lama Inertia/Mantine/Tailwind/CSS Modules. Jangan menambahkan framework atau desain berlebihan.

**Tujuan MVP lengkap (P0):** login demo; import Excel dan validasi; klasifikasi DeepSeek (high/medium/low, reason, recommendation); kesimpulan AI per karyawan dan departemen dengan FTE saving dan prioritas; dashboard FTE dan departemen; grouping lintas departemen beserta FTE; export PDF, Excel, results.json; cache, retry, status; README dan deliverable. Dataset final: 60 aktivitas, 12 karyawan, 3 departemen. `results.json` wajib dihasilkan aplikasi, bukan manual.

**Stack wajib:** Laravel 13 + PHP 8.4; MySQL; React + TypeScript + Vite + React Router; Vanilla CSS; REST API JSON + Axios; Sanctum SPA cookie/session/CSRF; DeepSeek `deepseek-flash` mode non-thinking; PhpSpreadsheet; DomPDF; Recharts bila dibutuhkan; Laravel Database Queue/Cache; PHPUnit. Satu repo, backend di root dan frontend di `frontend/`, tidak dua deploy terpisah untuk production. Tujuh tabel inti sesuai ERD; tabel infrastruktur Laravel boleh bertambah.

**Nilai dan aturan bisnis penting:**
- FTE tahunan = volume * duration_minutes * faktor / 115200; daily=240, weekly=48, monthly=12.
- Saving baseline high=0.60, medium=0.30, low=0.10; `estimated_fte_saving = fte * saving_rate`.
- Level High bukan penghapusan human oversight; keputusan berisiko tetap manusia.
- DeepSeek menilai repetitiveness/rule clarity/data structure/human judgment/operational risk, automation level, group, reason, recommendation, risk dan effort; LLM tidak menentukan angka FTE atau saving.
- Grouping dari 20 kode tetap pada evaluation workbook, bukan kategori bebas; kelompok boleh lintas departemen, tanpa double counting.
- Prompt AI versioned di file `resources/prompts/`; respons JSON/enum/ID divalidasi; cache fingerprint termasuk konten dan versi model/prompt/rubrik/taksonomi.
- Perhitungan total FTE dataset: **4.4671875**, ACT-0001 **0.1875**. Gunakan ini sebagai assertion tes import dan calculator.
- AI evaluation reference bersifat manual dan **tidak boleh dikirim sebagai label jawaban ke LLM**.

**PEKERJAAN YANG HARUS DIKERJAKAN SEKARANG (FASE 1 — FOUNDATION + IMPORT/FTE):**
A. Lakukan preflight: cek isi repo, `php -v`, `php --ini`, lokasi executable PHP, Composer, Node/npm, MySQL serta port; tulis temuan singkat dan kemudian langsung implementasikan sejauh environment mengizinkan.
B. Inisialisasi Laravel 13 di root (jika belum ada), atur struktur folder yang rapi, `.gitignore`, `.env.example`, config database/queue/cache. Jangan commit `.env` atau key.
C. Buat React + TypeScript + Vite SPA di `frontend/`, React Router, Axios, file CSS biasa dengan layout dashboard sederhana dan responsif; jangan pakai framework CSS/UI.
D. Siapkan REST API dan Sanctum cookie-based SPA login/logout/current user, CSRF, proteksi endpoint; seed akun demo aman dan dokumentasikan kredensial demo nonproduksi di README.
E. Buat migrations, models, relasi, constraint untuk tujuh tabel domain sesuai ERD; seed 20 kategori `activity_groups` dari reference taxonomy; tabel `jobs`/`cache`/sessions Laravel boleh menggunakan migration standar.
F. Implementasi impor `.xlsx` sheet `Workload`: tepat sembilan kolom input wajib, validasi row-level dengan pesan dan nomor baris, identifier unik per import, nama/departemen karyawan konsisten, transaksional, simpan Excel asli privat; terima juga workbook kecil yang valid untuk testing (peringatkan bila di bawah minimum assessment).
G. Buat FteCalculator sebagai service PHP murni sesuai konfigurasi `config/ftemation.php`; gunakan precision memadai, unit tests untuk daily/weekly/monthly dan dataset referensi.
H. Buat halaman minimum login, dashboard ringkas, dan import/preview/hasil FTE di React. Data ambil dari REST API, bukan hardcode KPI.
I. Jalankan migrations, seeder, import dataset demo (melalui importer yang sama), PHPUnit dan `npm run build` jika environment memungkinkan; bila tidak, laporkan hambatan, jangan mengklaim test lulus.
J. Tulis README sementara mencakup setup Windows/Git Bash, perintah start Laravel, npm/Vite, MySQL, queue worker, demo credentials, import dataset, struktur proyek, dan jalur development lanjutan.

**Kriteria terima Fase 1:** user bisa login, import dataset, tersimpan 12 employees/60 activities/3 departemen, FTE total = 4.4671875 (sebelum pembulatan), ACT-0001=0.1875, ada tests penting yang benar-benar dijalankan. Jika tidak bisa menjalankan tes, beri alasan dan langkah menjalankannya.

**Setelah Fase 1:** berhenti pada checkpoint implementasi yang stabil dan laporkan: file berubah, keputusan teknis, perintah run, tes yang dijalankan beserta hasilnya, bagian yang gagal/belum terverifikasi, dan pekerjaan tepat berikutnya (Fase 2 DeepSeek Engine). Jangan membuat hasil DeepSeek, `results.json` final, atau akurasi evaluasi palsu. Jangan menghabiskan waktu untuk UI dekoratif, Flutter, atau deployment cloud sebelum P0 stabil.

Mulailah sekarang dengan membaca berkas dan mengecek repository, lalu kerjakan Fase 1 secara nyata. Jangan hanya memberikan rencana atau potongan kode terpisah; ubah file proyek langsung menggunakan tools Codex yang tersedia. Jika sebuah aksi memerlukan permission dari environment, mintalah permission yang relevan. Tanyakan hanya jika benar-benar ada blokir yang tidak dapat diputuskan dari dokumen.
