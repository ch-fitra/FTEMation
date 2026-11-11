# FTEMation — Pekerjaan berikutnya

Status tersedia: foundation, Sanctum session/CSRF, import Excel, kalkulator FTE, dan UI workload dasar. Fitur AI serta laporan final belum selesai.

## 1. DeepSeek AI Engine

- Integrasikan `deepseek-flash` non-thinking melalui Laravel HTTP Client.
- Simpan prompt/rubrik versioned di `resources/prompts/` saat implementasi dimulai.
- Validasi JSON, enum, ID aktivitas, 20 kategori, lima faktor, dan human oversight; tolak output kosong/terpotong.
- Gunakan database queue, timeout, retry/backoff terbatas, idempotency, cache fingerprint, token usage, serta status.
- Buat API/UI run, progress, dan retry. Gunakan fakes pada tes; inference nyata memerlukan konfigurasi API valid.

## 2. Insight dan export

- Laravel menghitung agregat, saving, dan prioritas; AI menyusun penilaian kualitatif serta narasi.
- Lengkapi ringkasan karyawan/departemen dan grouping lintas departemen.
- Tambahkan dashboard hasil, detail alasan/rekomendasi/faktor/risiko/effort/oversight.
- Export PDF/Excel/results.json hanya dari run lengkap dengan seluruh aktivitas success dan summary lengkap.
- Uji konsistensi antarformat; jangan menghasilkan hasil AI palsu.

## 3. QA dan pengumpulan

- Cocokkan seluruh P0 dengan PRD dan studi kasus asli.
- Uji migration bersih hanya pada database uji terisolasi. Jangan reset `ftemation` yang berisi data pengguna.
- Verifikasi cache, retry, validasi AI, import workbook, build, dan alur browser.
- Lengkapi panduan Windows, ERD, ZIP tanpa secrets/dependency terpasang, video 8–10 menit, serta folder pengumpulan.

What-If, Flutter, dan fitur opsional menunggu seluruh P0 stabil. Lihat [PRD](PRD_v1.1.md) dan [panduan developer](DEVELOPMENT.md).
