# FTEMation — Codex Starter Kit v1.1

Paket dokumen ini dimaksudkan untuk **diekstrak ke root repository yang akan dipakai Codex**, misalnya `D:/Project/FTE-Mation/`.

## Mulai
1. Salin seluruh isi paket ke root proyek (bukan folder bersarang). Jika proyek sudah ada, cek sebelum overwrite.
2. Buka folder `D:/Project/FTE-Mation/` di VS Code.
3. Aktifkan Codex di workspace ini, atau jalankan `codex` dari terminal Git Bash di folder proyek setelah login.
4. Tempel seluruh isi `CODEX_START_PROMPT.md` sebagai pesan awal ke Codex. Codex akan membaca `AGENTS.md` di root dan referensi lainnya.
5. Setelah fase 1 benar-benar selesai, kirim prompt berikutnya dari `CODEX_NEXT_PHASES.md` satu per satu.

## Dokumen dalam paket
- `AGENTS.md`: aturan berulang bagi Codex; dibaca otomatis jika ditemukan di root repo.
- `CODEX_START_PROMPT.md`: instruksi siap salin untuk mulai implementasi Fase 1.
- `CODEX_NEXT_PHASES.md`: instruksi fase AI, dashboard/export, dan QA.
- `references/Studi Kasus AI Insight.pdf` + `.txt`: requirement wajib Tancorp (file TXT memudahkan pembacaan jika PDF tidak terurai).
- `docs/PRD_v1.1.md`: PRD yang telah direvisi dari v1.0 mengikuti stack terakhir.
- `docs/TECH_STACK_DECISIONS_v1.1.md`: keputusan teknologi terbaru untuk mencegah pemakaian Inertia/Mantine/Tailwind.
- `docs/ERD_v1.mmd` dan `docs/ERD_v1.png`: model database tujuh tabel.
- `docs/DATASET_GUIDE.md`: asumsi dataset dan hasil FTE audit.
- `samples/FTEMation_Workload_Dataset_v1.xlsx`: dataset utama 60 aktivitas.
- `samples/FTEMation_AI_Evaluation_v1.xlsx`: referensi evaluasi dan 20 kategori.

## Peringatan
- `references/Studi Kasus AI Insight.pdf` adalah sumber utama untuk persyaratan; `docs/PRD_v1.1.md` adalah keputusan implementasi, bukan dokumen resmi Tancorp.
- `docs/PRD_v1.1.md` menggantikan versi PRD sebelumnya untuk stack teknologi. Jangan lampirkan PRD v1.0 tanpa penjelasan karena masih memuat Inertia dan Mantine.
- Tidak perlu melampirkan percakapan panjang, screenshot akun API, API key, saldo API, atau file `.env`.
- Buat `.env` di komputer lokal dan tambahkan `DEEPSEEK_API_KEY` hanya di sana.
- Jangan mengklaim dataset evaluasi sebagai ground truth teruji atau hasil AI model.
