# Diagnosis antrean Run 5 — 12 November 2026

## Penyebab dan bukti

Run 5 milik Dataset 4 berisi 120 aktivitas. Pada pemeriksaan awal sekitar 11:49 WIB, tidak ada proses PHP `artisan queue:work` aktif. Web server aktif, tetapi `composer dev` memang hanya menjalankan server HTTP. Tidak tersedia bukti yang memastikan alasan worker sebelumnya berhenti; log worker terakhir diperbarui pada 11 November, sebelum run ini dibuat.

Job database 59 dan 60 sama-sama berada pada queue `analysis`, `attempts=0`, `reserved_at=null`, dan waktu tersedia sudah lewat. Keduanya merujuk Run 5. `started_at=null`, 120 aktivitas `pending`, request/token nol, tanpa failed job dan tanpa lock Run 5. Ini menunjukkan job belum pernah diambil, bukan permintaan DeepSeek yang lambat. API key terkonfigurasi dan file CA tersedia; validitas key, saldo, dan konektivitas provider tidak diuji dengan request berbayar.

Kode retry lama menganggap heartbeat lebih dari 10 menit cukup untuk menambah job baru. Job 60 dan heartbeat Run 5 pada 11:38:13 WIB sesuai jalur retry tersebut, sementara job 59 masih tersedia. Menekan retry tidak menghidupkan worker dan justru menambah antrean. Log Laravel sebelum diagnosis memuat error historis termasuk MaxAttempts, tetapi tidak membuktikan job Run 5 pernah dijalankan; attempts kedua job tetap nol. Tes worker sengaja memicu exception dalam database SQLite terisolasi dan dapat menambahkan pesan pengujian ke log aplikasi; pesan tersebut bukan kegagalan run pengguna.

Konfigurasi efektif: database queue, default queue `default`, tetapi dispatch aplikasi secara eksplisit memakai `analysis`. Worker harus mendengarkan `analysis`; worker default tidak cukup. Shared cache memakai database. Konfigurasi tidak di-cache. Timeout HTTP 90 detik, maksimal 3 percobaan, timeout job 360 detik, lock 400 detik, retry_after 420 detik. Tidak ada perubahan `.env`, prompt, rumus, klasifikasi, atau snapshot hasil.

## Perbaikan

- `AnalysisQueueHealth` membaca metadata jobs tanpa unserialize payload dan melaporkan heartbeat worker, job menunggu/dipegang/tertunda serta kondisi stalled. Endpoint status tetap dilindungi ownership.
- Event `JobPopping` mencatat sinyal worker database/analysis dalam shared cache. Tanpa sinyal baru UI menyatakan worker belum terdeteksi, bukan kepastian proses mati. Sinyal kedaluwarsa setelah 420 detik; ini mencakup satu batch normal.
- Retry memakai mutex yang sama dengan worker. Jika job menunggu atau reservation dapat diambil ulang, retry mengembalikan run yang sama tanpa dispatch atau reset. Pemulihan run aktif hanya tersedia setelah 10 menit tanpa heartbeat dan tanpa job. Reservation aktif/lock worker mencegah reset batch.
- Continuation tidak menambah job ketika sudah ada job lain yang dapat diproses. Callback kegagalan job duplikat tidak menggagalkan run jika job lain masih menunggu. Kedua job pengguna tidak dihapus atau diubah saat diagnosis.
- UI membedakan `queued` dan `processing`, menghilangkan spinner untuk antrean, memberi petunjuk worker/antrean lama, menyembunyikan retry yang tidak diperlukan, serta melanjutkan polling setelah kegagalan pembacaan status sementara. Navigasi/refresh tidak membatalkan job.
- `workload:work` menyediakan perintah worker dengan konfigurasi yang sesuai. Tanpa `--allow-paid` perintah menolak memulai worker. Flag ini merupakan persetujuan operator; UI tetap meminta konfirmasi biaya untuk start/retry.

## Verifikasi

Hasil akhir: 80 tes backend lolos (2826 assertions), build dan lint frontend lolos, Pint lolos, serta tes regresi navigasi browser lolos.

Backend memakai SQLite in-memory dan fake HTTP, termasuk database queue Worker asli terhadap database tes: worker tidak aktif, delayed job, heartbeat queue yang salah/benar/kedaluwarsa, reservation aktif/kedaluwarsa, lock contention, retry tanpa dispatch ganda, dua job lama, pemulihan progres, timeout koneksi, kegagalan autentikasi/JSON/summary, bounded retry, cache dan snapshot historis.

Browser sintetis pada 1440px, 390px, dan 320px memeriksa status antrean yang jujur, warning worker mati/stalled/delayed, tidak ada overflow, navigasi/refresh, pemulihan polling setelah HTTP 503, dan recovery memakai ID run yang sama. POST recovery dipenuhi fixture browser, tidak dikirim ke Laravel. Opsi `--live` tersedia untuk memeriksa halaman Run 5 aktual pada desktop/mobile; hanya POST login diizinkan, semua perubahan analisis diblokir. Pada sesi ini login live dengan kredensial demo `.env` ditolak HTTP 422, sehingga verifikasi browser live tidak selesai. Akun/password tidak diubah. Diagnosis run aktual dilakukan melalui bootstrap aplikasi secara read-only; pengujian browser sukses memakai API sintetis. Artefak: `storage/framework/testing/analysis-queue/`.

Hash tabel `analysis_runs`, `activity_analyses`, `jobs`, dan `failed_jobs` sama sebelum/sesudah pemeriksaan. Tidak ada reset database, penghapusan job, run baru, inference berbayar, commit, atau push.

## Melanjutkan Run 5

Setelah pemilik menyetujui biaya DeepSeek, jalankan `php artisan workload:work --allow-paid` dari root proyek pada terminal terpisah. Jangan membuat run baru atau menekan retry: job 59/60 masih dapat diproses. Worker memuat kode terbaru, memproses batch secara terkunci, memakai cache bila valid, dan melewati hasil sukses. Pantau Run 5 pada `/analysis?dataset=4&run=5`. Jika terjadi error provider, periksa pesan tersanitasi sebelum retry run yang sama. Untuk operasi terus-menerus, kelola worker dengan process manager agar hidup kembali setelah mesin/aplikasi restart; worker sengaja tidak otomatis dinyalakan oleh diagnosis ini.

Windows lokal tidak memiliki PCNTL: timeout HTTP berlaku, tetapi batas keras proses worker tidak dapat dibuktikan pada lingkungan ini. Linux/PCNTL disarankan untuk worker permanen. Crash setelah provider menerima request tetapi sebelum hasil tersimpan tetap dapat menyebabkan request ulang pada pemulihan; exactly-once lintas provider/database tidak dijamin. Untuk Run 5 saat diagnosis, kedua job belum pernah diambil sehingga tidak ada request sebelumnya yang perlu direkonsiliasi.

Referensi perilaku worker dan timeout: [Laravel 13 Queues](https://laravel.com/docs/13.x/queues). Pengujian implementasi memakai kode Laravel yang terpasang di repository.
