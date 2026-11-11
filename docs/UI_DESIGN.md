# FTEMation UI design

Panduan aktif, 11 November 2026. Dokumen ini mendeskripsikan implementasi saat ini; bukan pengganti catatan audit historis.

## Arah visual

Calm Enterprise SaaS: navy, aksen cyan, canvas netral, panel putih. Login, logo, dan struktur sidebar dipertahankan. CSS biasa; tidak ada pustaka komponen atau dependency visual baru.

Token di `frontend/src/styles/base.css`: `--navy`, `--navy-soft`, `--primary`, `--primary-hover`, `--accent`, `--text`, `--muted`, `--border`, `--canvas`, `--surface`. Gunakan warna status bersama teks level/status. Semua angka FTE memakai formatter empat desimal; tidak menghitung saving kembali di React.

Hierarki: judul workspace H1, judul halaman/bagian H2, aktivitas H3, label/caption sekunder, angka KPI dominan. Spacing mengikuti skala existing 4/8/12/16/24/32; kartu peluang memakai padding 18px dan gap 20px agar konsisten dengan panel existing. Panel disclosure metodologi menampilkan rumus hanya ketika dibuka.

## Komponen dan interaksi

- `MetricCard`: total workload, saving, remaining, oversight. Nilai kosong memakai em dash, bukan nol palsu.
- `OpportunityCards`: tiga aktivitas menurut urutan `priorities` Laravel. Dashboard menampilkan rekomendasi peluang pertama; analisis menyediakan tombol detail untuk semua kartu.
- `ActivityAnalysisDialog`: dialog native dengan nama aksesibel, fokus awal pada Tutup, Escape, pembatasan fokus native dan scroll internal. Lebar maksimum 760px, maksimum tinggi 88dvh, margin mobile 12px. Menyajikan faktor, alasan, rekomendasi, risiko, effort, oversight, FTE/saving dan grouping.
- `Select`: komponen existing untuk dataset dan filter, mempertahankan keyboard dan portal dropdown. Selector workspace memiliki nama aksesibel eksplisit.
- `ErrorAlert`: menghitung pesan unik, mengelompokkan error baris, mempertahankan isi diagnostik dan `role=alert`.
- Konfirmasi native sebelum start/retry analisis menjelaskan penggunaan layanan AI dan kemungkinan saldo API. Pembatalan tidak mengirim request.

## Konteks dan data

Dataset terlihat di seluruh halaman, termasuk nama file, ID, jumlah aktivitas/karyawan/departemen dan completed run. Status terbaru dapat berbeda dari run sumber KPI; kedua konteks ditampilkan terpisah. URL detail: `/analysis?dataset=<id>&run=<id>&activity=<code>`. Run harus memiliki `import_id` yang cocok. Sidebar mempertahankan parameter dataset. Respons async lama diabaikan; summary disimpan bersama identitas dataset.

Ringkasan API menambahkan `top_opportunities`, `oversight_count`, dan `analysis_model`; field lama tetap tersedia. Endpoint template Sanctum menghasilkan tepat satu sheet Workload dan sembilan header menggunakan konstanta importer. Tidak ada preview isi workbook sebelum import.

## Responsif dan aksesibilitas

Grid peluang tiga kolom, menjadi satu kolom di bawah 768px; KPI memakai grid responsif existing. Dataset context bertumpuk di bawah 1024px. Tabel tetap memiliki scroll lokal. Focus ring terlihat dan reduced-motion mematikan transisi/animasi. Touch target tombol detail minimal 44px. Tidak menambahkan sticky header karena struktur scroll tabel existing tidak membutuhkannya.

Target WCAG 2.2 AA; pemeriksaan browser yang tercatat mencakup overflow, fokus awal dialog dan Escape. Belum merupakan sertifikasi kontras seluruh state atau audit screen reader.
