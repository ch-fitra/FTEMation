# AGENTS.md — FTEMation

## Tujuan
Bangun FTEMation untuk assessment AI Insight Workload Assessment Tancorp: Laravel 13 + React SPA dengan REST API, AI DeepSeek Flash, perhitungan FTE deterministik, grouping lintas departemen, dashboard, dan export.

## Baca sebelum coding
1. `references/Studi Kasus AI Insight.txt` dan PDF-nya — persyaratan wajib.
2. `docs/TECH_STACK_DECISIONS_v1.1.md` — keputusan stack paling baru; mengesampingkan stack usang.
3. `docs/PRD_v1.1.md` — acceptance criteria dan scope.
4. `docs/ERD_v1.mmd` — tujuh tabel domain.
5. `docs/DATASET_GUIDE.md` dan workbook di `samples/` — data dan referensi evaluasi.

## Aturan wajib
- Gunakan Laravel 13, React+TypeScript+Vite, React Router, REST JSON API+Axios, dan **CSS biasa**. Tidak Inertia, Tailwind, Mantine, Bootstrap, CSS Modules, Redux, microservices.
- Backend Laravel di root repository, React di `frontend/`; upayakan deployment satu origin untuk build.
- Auth Sanctum SPA dengan session cookies/CSRF; lindungi endpoint private; jangan simpan token otentikasi jangka panjang di localStorage.
- Gunakan tujuh tabel domain saja sesuai ERD; tabel infrastruktur Laravel diperbolehkan.
- DeepSeek untuk penilaian teks; Laravel untuk FTE, saving, prioritas, agregasi. Tidak ada training atau model dummy yang dilabeli hasil riil.
- Input Excel sembilan kolom wajib, satu sheet `Workload`; validasi detail; lakukan import dalam transaction; file disimpan privat.
- Simpan model/version/prompt, request status, cache key, failure, tokens jika tersedia. Prompt versi di file terpisah.
- Perlakukan API output sebagai tidak dipercaya: validasi JSON shape, enum, ID, grouping dan kebijakan oversight; retry terbatas.
- Tidak mengekspor `results.json` sebagai final sebelum seluruh aktivitas dalam satu run sukses. `results.json` dihasilkan otomatis oleh aplikasi.
- Simpan secrets hanya di `.env`; `.env.example` placeholder; jangan cetak API key pada log atau output.
- P0 sebelum fitur dekoratif, Flutter, deployment rumit, atau What-If.

## Cara bekerja
- Periksa keadaan repository, versi dependensi, konfigurasi lokal, dan dokumentasi sebelum mengubah file.
- Implementasikan tahapan kecil; jalankan tes yang tersedia serta perintah build/lint yang relevan; laporkan hasil nyata dan yang belum diuji.
- Hindari menimpa file pengguna; perubahan yang destruktif atau menghapus file memerlukan persetujuan.
- Jika API key atau database tidak tersedia, buat kode serta tests menggunakan fakes/mocks; jangan klaim inference sungguhan.
- Jangan mengklaim assessment selesai sebelum test dan deliverable terverifikasi.
