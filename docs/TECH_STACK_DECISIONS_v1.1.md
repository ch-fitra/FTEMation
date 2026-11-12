# FTEMation — Keputusan Teknis Terbaru v1.1

Status: TERKUNCI untuk MVP assessment. File ini lebih baru daripada PRD v1.0 dan mengesampingkan seluruh rujukan stack lama. Tetap ikuti PDF assessment untuk persyaratan wajib.

## Teknologi
- Backend: Laravel 13, PHP 8.4, controller REST JSON + service layer.
- Frontend: React + TypeScript + Vite + React Router, di folder `frontend/`, dalam repository yang sama.
- Styling: **Vanilla CSS (.css biasa)**; boleh variabel CSS dan komponen React reusable sederhana.
- Komunikasi: REST API, Axios. **Jangan Inertia.js.**
- Auth: Laravel Sanctum SPA berbasis session cookie dan CSRF. Dev pakai satu hostname konsisten (`localhost` atau `127.0.0.1`, jangan campur), Vite proxy bila membantu. Production satu origin Laravel yang menyajikan build React.
- Database: MySQL 8; tujuh tabel inti `users`, `imports`, `employees`, `activities`, `analysis_runs`, `activity_groups`, `activity_analyses`. Tabel bawaan Laravel untuk queue/cache/session boleh ada di luar tujuh tabel domain.
- LLM: DeepSeek API; model alias `deepseek-flash`; mulai non-thinking; JSON object + Laravel validation. Tidak training/fine-tuning.
- Excel: PhpSpreadsheet, import 9 kolom; export xlsx dari hasil DB.
- PDF: DomPDF atau paket `barryvdh/laravel-dompdf` bila terbukti kompatibel di environment; jangan mengasumsikan tersedia tanpa cek composer.
- Chart: Recharts; Icon: Lucide React (jika dibutuhkan).
- Job/cache: Database queue dan database cache Laravel; retry terbatas; pencatatan status dan token.
- Testing: PHPUnit; jangan menambahkan tooling testing tambahan jika tidak diperlukan.

## Batasan dan keputusan domain
- Periode tahunan: daily=240, weekly=48, monthly=12; kapasitas satu FTE=115200 menit/tahun.
- Saving baseline: high=60%, medium=30%, low=10%; hanya estimasi waktu, **bukan keputusan PHK**.
- AI menilai 5 faktor: repetitiveness, rule clarity, data structure, human judgment, operational risk.
- AI menentukan level, alasan, rekomendasi, risk, effort, oversight; Laravel hitung FTE/saving/priority/agregasi.
- Grouping: gunakan **20 kategori baku** di `samples/FTEMation_AI_Evaluation_v1.xlsx` sheet `GroupTaxonomy`, seed ke `activity_groups`, satu kategori per aktivitas, tidak otomatis semua level sama.
- Prompt LLM terpisah, versioned; JSON schema divalidasi; cache fingerprint memuat konten relevan + model + prompt/rubrik/taksonomi.
- Executive summary per employee/department wajib; angka disusun Laravel, AI membuat narasi dan Laravel memastikan tidak ada angka yang menggantikan sumber kalkulasi.
- Prioritas peluang: `100 * (saving/maxSavingRun) * riskFactor * effortFactor`, maxSavingRun=0 menghasilkan 0. Bobot low/medium/high untuk risk=1/0.7/0.4 dan effort=1/0.75/0.5. P1 jika P0 belum selesai.
- What-If slider P2; Flutter P3/tidak wajib.
- Data utama sintetis: 60 aktivitas, 12 karyawan, 3 departemen; target FTE total 4.4671875 (sebelum pembulatan), ACT-0001=0.1875.

## Keputusan pengembangan hemat waktu
1. Implementasi P0 lebih dahulu, jangan overengineer, tidak microservices.
2. Satu repository, dua folder logis (Laravel root, `frontend/`).
3. Buat pengalaman login -> import -> AI run -> dashboard/grouping/summaries -> export yang bisa direproduksi.
4. Jangan pernah menyimpan API key di Git/README; gunakan `.env` dan `.env.example` dengan placeholder.
5. Jangan membuat output AI palsu; demo dapat menggunakan hasil inference riil yang tersimpan dari run sebelumnya.

## Referensi resmi
- Laravel 13: https://laravel.com/docs/13.x
- Sanctum SPA: https://laravel.com/docs/13.x/sanctum
- DeepSeek Chat Completion: https://api-docs.deepseek.com/api/create-chat-completion/
- DeepSeek JSON Output: https://api-docs.deepseek.com/guides/json_mode/
- DeepSeek thinking mode: https://api-docs.deepseek.com/guides/thinking_mode/
- PhpSpreadsheet: https://phpspreadsheet.readthedocs.io/
