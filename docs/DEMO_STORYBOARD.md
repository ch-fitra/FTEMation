# Naskah dan storyboard demo FTEMation

Target 9 menit 30 detik, Bahasa Indonesia, dengan jeda klik dan membaca layar. Ini naskah, bukan video yang sudah direkam. Latih sekali dengan timer; sesuaikan jeda agar durasi final 8–10 menit. Jangan tampilkan `.env`, key, password server, cookie, atau log mentah.

Persiapan: server Laravel/build aktif, MariaDB aktif, dataset referensi dan completed run #1 tersedia. Gunakan akun demo lokal. Buka workbook, README, results.json, XLSX dan PDF hasil aplikasi pada tab terpisah. Jangan memulai inference berbayar untuk rekaman. Jika demonstrasi cache nyata diperlukan, gunakan run #2 tersimpan dan metadata nol request/cache hit; retry ditunjukkan dengan tes provider palsu di terminal, bukan memalsukan status UI. Import baru boleh direkam secara manual, tetapi jangan klik Mulai analisis untuk dataset baru tanpa anggaran/izin.

## 00:00–00:45 — Pembuka dan login

Layar: halaman login, masukkan akun demo, klik Masuk, tunggu Overview. Tutupi password saat merekam; tidak perlu menyebutkannya keras-keras.

Narasi: “Halo, saya akan memperkenalkan FTEMation, aplikasi penilaian beban kerja dan peluang otomatisasi. Tujuannya membantu HR dan IT memahami aktivitas yang dicatat, jenis bantuan AI yang mungkin diterapkan, serta urutan peluang yang layak ditinjau. Data demonstrasi ini sintetis, bukan data internal Tancorp. Aplikasi menggunakan Laravel tiga belas sebagai REST API, React dan TypeScript untuk antarmuka, serta DeepSeek untuk penilaian teks. Perhitungan beban kerja tetap dilakukan program agar dapat ditelusuri. Saya masuk dengan akun demo. Autentikasi memakai session cookie dan CSRF, sehingga halaman data hanya tersedia setelah login.”

## 00:45–01:45 — Workbook dan import

Klik Import dataset. Tunjukkan workbook Workload dan sembilan header, pilih file referensi, klik Validasi & import jika ingin memperlihatkan import baru. Tunggu hasil; untuk langkah berikut pilih kembali dataset referensi yang memiliki run lengkap.

Narasi: “Dataset ini berisi enam puluh aktivitas dari dua belas karyawan pada tiga departemen. Kolomnya memuat identitas aktivitas dan karyawan, departemen, nama serta deskripsi pekerjaan, frekuensi, volume, dan durasi per unit. Worksheet harus bernama Workload. Tidak ada jawaban High, Medium, Low atau kategori grouping pada input. Saat diunggah, aplikasi memeriksa header, ID duplikat, konsistensi karyawan, frekuensi, serta angka positif. Formula Excel tidak dijalankan. Jika ada kesalahan, pengguna mendapat rincian baris dan transaksi tidak meninggalkan sebagian aktivitas. File disimpan privat. Import baru menjadi riwayat terpisah, sehingga versi data lama tidak ditimpa. Untuk melihat hasil inference yang sudah valid tanpa biaya baru, sekarang saya memilih kembali dataset referensi yang telah dianalisis.”

## 01:45–02:40 — FTE baseline dan Overview

Klik Overview, tunjuk total, saving, distribusi dan metode. Buka Data aktivitas, cari ACT-0001 dan rincian kalkulasi.

Narasi: “FTE mengubah waktu aktivitas menjadi proporsi kapasitas kerja tahunan. Volume dikalikan durasi per unit dan faktor frekuensi tahunan, lalu dibagi seratus lima belas ribu dua ratus menit. Faktor daily dua ratus empat puluh, weekly empat puluh delapan, dan monthly dua belas. Contoh ACT-0001 memiliki sepuluh unit per hari dengan sembilan menit per unit; hasilnya nol koma satu delapan tujuh lima FTE. Total dataset sekitar empat koma empat enam tujuh dua FTE. Ini beban kerja yang tercatat, bukan seluruh kapasitas dua belas orang. Setelah analisis lengkap tersedia, seluruh KPI, perbandingan departemen dan metodologi Overview mengikuti snapshot run lengkap yang sama. Perubahan konfigurasi aktif tidak membuat total FTE memakai skenario berbeda dari saving.”

## 02:40–03:50 — Hasil AI dan batas otomatisasi

Klik Analisis AI, pilih run #1. Perlihatkan status, 60 success, model, token, filter High/Medium/Low. Buka rincian ACT-0002 lalu satu aktivitas Low.

Narasi: “Run ini merupakan hasil DeepSeek yang sudah tersimpan. Enam puluh aktivitas berhasil, dengan dua puluh satu High, dua puluh empat Medium dan lima belas Low. AI memberikan alasan, rekomendasi, lima faktor evaluasi, effort, cakupan otomatisasi, serta kebutuhan human oversight. High berarti mayoritas langkah administratif terstruktur dapat dibantu otomatisasi; Medium masih memiliki review atau exception signifikan; Low lebih bergantung pada judgment manusia. Lima faktornya repetitiveness, rule clarity, data structure, human judgment dan operational risk. Risiko tinggi tetap memerlukan oversight. Mari lihat alasan dan rekomendasi pada detail aktivitas. Pada ACT-0002 model menyarankan three-way matching, padahal input hanya memastikan invoice dan PO. Karena itu rekomendasi perlu dikonfirmasi dengan pemilik proses sebelum implementasi. Hasil historis tidak kami ubah agar cocok dengan referensi. Untuk keputusan strategis atau keselamatan, AI tetap menjadi pendukung dan keputusan final berada pada manusia.”

## 03:50–04:45 — Grouping lintas departemen

Klik Grouping, buka satu grup dengan anggota lintas departemen, jelaskan total FTE/saving dan anggota unik.

Narasi: “Grouping menggabungkan mekanisme kerja serupa, bukan sekadar departemen atau kata yang mirip. AI memilih tepat satu kategori dari dua puluh taksonomi tetap. Sebagai contoh, validasi berbasis aturan dapat terjadi di Finance maupun Operations, walaupun objek dokumennya berbeda. Anggota, departemen yang terlibat, total FTE dan saving ditampilkan pada setiap kelompok. Satu aktivitas muncul sekali, sehingga tidak terjadi double counting. Aktivitas dalam grup yang sama masih boleh memiliki level otomatisasi dan risiko berbeda. Pasangan aging report dan review headcount pada evaluasi juga perlu ditinjau: satu dominan menyusun laporan, yang lain memeriksa selisih terhadap rencana. Kesamaan artefak laporan tidak selalu berarti mekanisme kerjanya sama.”

## 04:45–05:50 — Kesimpulan dan prioritas

Klik Karyawan, Departemen, lalu Prioritas. Sorot narasi, angka dan tiga peluang teratas.

Narasi: “Kesimpulan tersedia untuk setiap karyawan dan departemen. Laravel menghitung agregat, lalu AI menulis narasi peluang dan batas pengawasan. Narasi tidak diizinkan mengganti angka perhitungan. Estimasi saving run referensi sekitar satu koma enam tujuh dua lima FTE, dengan sisa workload sekitar dua koma tujuh sembilan empat tujuh FTE. Saving memakai asumsi High enam puluh persen, Medium tiga puluh persen dan Low sepuluh persen yang tersimpan pada run, bukan persentase hasil tebakan model. Prioritas mempertimbangkan saving relatif terhadap saving terbesar dalam run, lalu bobot risiko dan effort. Semakin besar risiko atau effort, semakin kecil skornya pada saving yang sama. Ranking ini membantu memilih pilot, tetapi keputusan tetap perlu mempertimbangkan kesiapan data, integrasi dan pemilik proses. Angka saving adalah estimasi kapasitas waktu, bukan realisasi efisiensi atau keputusan pengurangan pegawai.”

## 05:50–07:00 — Cache, retry dan reliability

Pilih run #2 dan tunjuk 60 cache hit/nol request. Buka terminal tes yang telah disiapkan: `php artisan test --filter=AnalysisTest` atau tampilkan hasil tes sesi yang baru selesai. Jelaskan skenario fake tanpa mengeksekusi provider nyata.

Narasi: “Aplikasi menggunakan database queue dan cache privat per pemilik. Pada run cache ini, hasil aktivitas digunakan kembali sehingga tidak ada request inference tambahan. Fingerprint memuat konten relevan, model, prompt dan taksonomi; perubahan asumsi saving dapat menghitung skenario baru tanpa mengulang penilaian teks. Kesimpulan memakai agregat sebagai bagian cache key. Kegagalan API atau JSON invalid memiliki retry terbatas dan tidak ditampilkan sebagai hasil sukses. Aktivitas yang sudah sukses dipertahankan ketika bagian gagal dicoba ulang. Tes ini menggunakan provider palsu yang terisolasi. Termasuk regresi saat lock sedang dipegang worker lain: job dilepas sementara, lalu berhasil dilanjutkan tanpa false failure. Fatal exception tetap ditandai gagal, dan worker kedua tidak masuk ke batch yang sedang diproses. Retry contention memiliki batas, dengan pemulihan manual untuk heartbeat stale. Pada hosting tetap diperlukan worker aktif, timeout yang sesuai dan monitoring.”

## 07:00–08:20 — Tiga export

Kembali ke run #1 lengkap. Klik results.json, XLSX, PDF. Buka masing-masing: JSON aktivitas awal/akhir, Excel sheet Activities dan Groups, PDF halaman ringkasan serta detail aktivitas.

Narasi: “Ketiga format dihasilkan aplikasi dari satu completed run. Export final ditolak jika ada aktivitas atau kesimpulan yang belum lengkap. results.json berisi enam puluh activity_id unik, level, alasan, rekomendasi, group_id, FTE, estimated saving dan status success. Angka FTE serta saving dihitung Laravel. Workbook Excel menyediakan aktivitas, ringkasan, grouping dan asumsi, sementara teks disimpan literal agar aman terhadap formula injection. PDF memuat ringkasan, prioritas, perbandingan entitas, metodologi dan rincian aktivitas. Di sini kita dapat menelusuri angka dashboard ke aktivitas dan kategori yang sama. Tampilan export membulatkan sampai enam desimal, tetapi agregasi internal memakai angka sebelum pembulatan. Karena itu penjumlahan angka tampilan dapat berbeda sangat kecil dari total internal. Semua download tetap memerlukan autentikasi dan kepemilikan dataset.”

## 08:20–09:30 — Arsitektur, hasil tes dan penutup

Buka ERD, README metodologi dan checklist pengumpulan. Tampilkan hasil pengujian terbaru, sebut batas verifikasi hosting. Kembali ke Overview, lalu keluar bila waktu cukup.

Narasi: “ERD mempertahankan tujuh tabel domain, dengan tabel infrastruktur Laravel untuk queue, cache dan session. README menjelaskan instalasi mesin baru, konfigurasi model, worker, rumus dan batas interpretasi. Perbaikan audit utama menyelesaikan contention queue dan konsistensi snapshot dashboard. Hasil run lama tetap tersedia dan tidak ada inference baru yang diperlukan selama verifikasi ini. Kesesuaian tiga belas dari lima belas label adalah hasil pada sampel evaluasi terbatas, bukan klaim akurasi umum model. Aplikasi telah diuji secara lokal melalui unit dan feature test, build TypeScript, lint, smoke HTTP, browser serta export. Hosting target dan pemulihan worker OS masih membutuhkan verifikasi di lingkungan deployment. Paket source tidak menyertakan env, dependency, log atau upload privat. Berikutnya video ini dan artefak akan dikumpulkan sesuai ketentuan assessment. FTEMation menyediakan dasar yang transparan untuk diskusi HR dan IT: mulai dari aktivitas yang dicatat, menilai bantuan otomatisasi, lalu memilih pilot dengan kontrol manusia yang jelas. Terima kasih.”
