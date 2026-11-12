# Verifikasi kualitas AI

## Apa yang diuji

`tests/Feature/AnalysisTest.php` memakai SQLite in-memory, fake HTTP provider dan queue fake/worker database terisolasi. Tidak ada inference berbayar. Perpindahan v1 ke v2 diuji sampai completed run: snapshot/analyses v1 tidak berubah, fingerprint berbeda, cache v1 tidak dipakai v2, dan system prompt yang dikirim sesuai snapshot.

Lima pasangan sintetis diperiksa melalui kontrak `DeepSeekClient` dan `AiOutputValidator`:

| Pasangan | Referensi rubrik buatan untuk tes | Harapan advisory |
|---|---|---|
| Finance matching vs Procurement dengan perubahan termin/exception | High / Medium, data_reconciliation | Kandidat review; alasan kedua konteks dipertahankan |
| Input data lintas departemen | High / High, structured_record_entry | Tidak ada flag beda level |
| Laporan rutin vs investigasi | High / Low, kategori berbeda | Tidak memaksakan kategori sama |
| Administrasi vs persetujuan pembayaran | High / Low, kategori berbeda | Keputusan final wajib manusia |
| Tugas berulang berisiko rendah vs keputusan strategis | High / Low, kategori berbeda | Tidak menyamakan level karena kata/departemen |

Respons fake sengaja disusun menurut referensi rubrik; hasil lulus membuktikan kontrak/pipeline menerima perbedaan valid dan tidak mengganti hasil. Ini bukan hasil prediksi DeepSeek v2, ukuran konsistensi/akurasi model, atau ground truth yang telah diverifikasi ahli. Advisory berbasis grup dan level, bukan pendeteksi halusinasi atau semantic similarity model.

Regresi kontrol manusia mencakup empat skenario keputusan finansial, rekening, rekrutmen dan keselamatan dengan faktor risiko/judgment tinggi; output tanpa oversight ditolak. Respons FAQ dengan exception review dan boolean false tetap diterima. Pengujian ini memvalidasi kebijakan faktor/schema, tidak membuktikan model selalu memberi faktor risiko yang benar dari teks.

Export diuji dari completed fake run: field wajib JSON, ID unik, enam sheet, metadata literal anti formula injection, seluruh nilai Activities, KPI dan format persentase. D1 contention dan D2 calculation snapshot tetap termasuk suite penuh. Pemeriksaan run lokal menggunakan skrip read-only, membandingkan Excel/JSON, formula FTE/saving dan anggota grup tepat sekali.

## Batas validasi

JSON shape, enum, ID, scope dan aturan oversight dapat diperiksa secara deterministik. Validitas JSON tidak membuktikan bahwa rekomendasi didukung data, dokumen tersedia, toleransi disepakati, grouping tepat, atau saving telah terealisasi. V2 memperbaiki instruksi, belum menjamin perilaku model. Reviewer domain harus memeriksa prasyarat dan otoritas sebelum implementasi.

## Reproduksi

Jalankan perintah pengujian pada README. `phpunit.xml` memaksa `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:` dan DB_URL kosong. Jangan gunakan migrate:fresh atau db:wipe pada database lokal. Untuk bukti histori, simpan output `php scripts/verify-analysis-history.php` sebelum/sesudah dan bandingkan hash tabel, setiap report JSON dan berkas export tersimpan.

Inference v2 baru memerlukan persetujuan biaya terpisah. Bila disetujui nanti, gunakan run baru, pertahankan v1, review pasangan blind bersama ahli domain, catat prasyarat yang belum terbukti, lalu bandingkan reasoning tanpa memaksakan distribusi label tertentu.
