# AGENTS.md — FTEMation

## Tujuan
Bangun FTEMation untuk assessment AI Insight Workload Assessment Tancorp: Laravel 13 + React SPA dengan REST API, AI DeepSeek Flash, perhitungan FTE deterministik, grouping lintas departemen, dashboard, dan export.

## Baca sebelum coding
1. `README.md` — instalasi, peta kode, metodologi, worker dan pengujian.
2. Workbook di `samples/` — input referensi dan fixture evaluasi untuk tes.
3. Untuk perubahan requirement/domain, baca sumber assessment di docs/references/ dan spesifikasi di docs/; dokumen historis dapat tersedia di `../FTEMation-Archive-2026-11-11/references/` dan `../FTEMation-Archive-2026-11-11/docs/`. TECH_STACK_DECISIONS_v1.1.md mengesampingkan keputusan stack usang. Jangan menyalin kembali arsip/laporan ke root proyek tanpa kebutuhan.

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
- Baca `README.md` untuk peta kode, alur menjalankan program dan pengujian. Spesifikasi aktif berada di docs/; laporan historis tidak diperlukan untuk menjalankan aplikasi.
- Frontend: `src/app` untuk bootstrap/navigasi, `pages` untuk halaman, `layouts` untuk kerangka/header/sidebar, `components` untuk komponen bersama, `hooks` untuk state sesi/dataset, `lib` untuk HTTP/format, `types` untuk kontrak API, dan `styles` untuk CSS biasa.
- Business logic workload ada di `app/Services/Workload/`; controller dan Form Request tetap mengikuti struktur standar Laravel. Perbarui namespace dan tes ketika memindahkan class.
- Jangan membuat salinan starter kit, file `old`/`backup`/`copy`, atau implementasi kedua dari fitur yang sama. Simpan workbook fixture di `samples/`; laporan historis dan artefak pengumpulan berada di arsip luar proyek.
- Periksa keadaan repository, versi dependensi, konfigurasi lokal, dan dokumentasi sebelum mengubah file.
- Implementasikan tahapan kecil; jalankan tes yang tersedia serta perintah build/lint yang relevan; laporkan hasil nyata dan yang belum diuji.
- Hindari menimpa file pengguna; perubahan yang destruktif atau menghapus file memerlukan persetujuan.
- Jika API key atau database tidak tersedia, buat kode serta tests menggunakan fakes/mocks; jangan klaim inference sungguhan.
- Jangan mengklaim assessment selesai sebelum test dan deliverable terverifikasi.
