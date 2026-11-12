# Pembatalan dan resume Analisis AI

Fitur tetap memakai Laravel, session Sanctum/CSRF, REST JSON, React, dan CSS biasa. Tidak ada tabel domain tambahan.

## Perilaku pengguna

Pada run `queued` atau `processing`, tombol **Batalkan Analisis** membuka dialog dengan identitas dataset/run serta penjelasan bahwa aktivitas sukses tetap tersimpan. Tombol aman mendapat fokus awal; Escape/tutup kembali ke halaman tanpa mengirim pembatalan. Setelah konfirmasi, status menjadi **Menunggu pembatalan** (`cancel_requested`) atau langsung **Dibatalkan** (`cancelled`) bila tidak ada worker yang memegang mutex.

Worker menyelesaikan request yang sudah diterima untuk dikirim, menyimpan hasil valid beserta usage/cache, lalu mengakui pembatalan pada checkpoint. Tidak ada batch/HTTP retry baru yang diterima setelah intent pembatalan tersimpan. Browser terus polling selama `cancel_requested`. Navigasi atau refresh tidak menghapus permintaan pembatalan.

Run dibatalkan menyediakan **Lanjutkan Analisis** dengan konfirmasi biaya DeepSeek. Resume menggunakan ID run yang sama, snapshot prompt/model/asumsi yang sama, dan hanya mengantrekan pekerjaan belum sukses. `success`, reason/recommendation, faktor, cache, attempts, usage, actual model, dan histori lifecycle dipertahankan. Kesimpulan yang sudah berhasil saat pembatalan juga dipakai kembali tanpa request tambahan. UI membedakan **Dilanjutkan - menunggu antrean**, **Sedang diproses**, dan **Selesai**.

Hasil final/export tetap hanya tersedia untuk run `completed` dengan seluruh aktivitas serta kesimpulan lengkap. Run yang dibatalkan tidak dilabeli hasil final.

## API dan state

- `POST /api/analyses/{run}/cancel`
- `POST /api/analyses/{run}/resume`

Keduanya memerlukan session autentikasi, kepemilikan run, CSRF pada SPA, rate limit, serta payload `{"execution_version": 0}` sesuai versi dari GET status. Response 202 berisi `run.id` dan `run.status`; GET status tetap sumber lengkap progres/metadata. Payload tidak valid menghasilkan 422, konflik state/versi 409, run bukan milik pengguna 404, dan tanpa autentikasi 401.

State normal: `queued/processing → cancel_requested → cancelled → queued (versi berikutnya) → processing → completed`. Run `completed` tidak dapat dibatalkan/dilanjutkan. Start/retry tidak melewati state pembatalan; `cancel_requested` juga memblokir run aktif lain untuk dataset sama. Resume ditolak jika dataset mempunyai run aktif lain. Permintaan berulang pada eksekusi yang sama bersifat idempotent dan tidak menambah dispatch.

Migrasi `2026_11_12_000001_add_analysis_cancellation_metadata` menambahkan `execution_version` (default 0), tiga timestamp, dan `lifecycle_events` nullable pada `analysis_runs`. Snapshot historis tidak ditulis ulang. Verifikasi status migration pada database tujuan sebelum pembaruan.

## Perlindungan konkurensi

1. Intent pembatalan disimpan dengan row lock singkat, tanpa menunggu mutex batch yang bisa sedang melakukan HTTP.
2. Worker, acknowledgement, retry, resume, serta callback failure berbagi mutex run 400 detik. Tidak ada pematian proses PHP dan tidak ada penghapusan job manual.
3. Setiap percobaan HTTP mengunci row run sebentar untuk memeriksa status/versi dan mencatat request admission. Jika pembatalan menang lebih dulu, request tidak dikirim. Jika admission menang lebih dulu, request diperlakukan sebagai in-flight dan diselesaikan pada checkpoint berikutnya. Lock database tidak ditahan sepanjang network I/O.
4. Perubahan status worker menggunakan row lock dan pemeriksaan status/versi agar penyimpanan stale tidak menghapus intent pembatalan. Hasil valid dari response disimpan, termasuk ketika intent sudah `cancel_requested`.
5. Resume/recovery menaikkan `execution_version`; setiap job membawa versi tersebut. Job lama, delayed, duplikat, dan callback failure versi lama menjadi no-op untuk run yang dilanjutkan. Health/dedup queue hanya menghitung job versi aktif. Job lama yang tidak mempunyai field versi kompatibel dengan default 0.
6. Payload versi pada cancel/resume menolak permintaan terlambat dari eksekusi sebelumnya. Penyimpanan hasil/kesimpulan juga diperiksa versinya; response stale tidak menimpa hasil versi baru dan cache valid tetap tersedia.
7. Polling UI mengabaikan response lama yang dimulai sebelum aksi lifecycle. Error aksi tetap berada dalam dialog, terpisah dari error polling.

Tidak ada perubahan angka timeout sebelumnya: HTTP maksimal 3 × 90 detik, job 360, mutex 400, retry_after 420. Worker harus memuat kode terbaru sesudah pembaruan.

## Pengujian dan batasan

Request DeepSeek yang sudah diterima untuk dikirim tidak dapat ditarik kembali oleh fitur ini dan mungkin tetap dikenai biaya. Usage hanya dapat dicatat bila provider mengembalikannya. Cancel tidak memberikan refund dan tidak menghapus metadata biaya. Kematian proses setelah request diterima provider tetapi sebelum hasil disimpan tetap merupakan kondisi ambigu; exactly-once lintas database/provider tidak dijamin. Sebelum pemulihan setelah crash/timeout yang ambigu, pengelola perlu memeriksa worker/log dan kemungkinan request masih berjalan. Windows lokal tanpa PCNTL tidak menyediakan jaminan hard timeout; worker Linux/PCNTL disarankan untuk operasi permanen. Tes SQLite memverifikasi interleaving deterministik, bukan stress test banyak proses MySQL secara bersamaan.

Jika worker mati saat `cancel_requested`, job berikutnya atau callback failure akan mengakui pembatalan. Setelah 10 menit UI juga menyediakan **Periksa pembatalan**, yang mengulang acknowledgement melalui endpoint sama tanpa inference; mutex harus sudah bebas. Jangan melanjutkan secara manual sebelum memeriksa proses worker yang mungkin masih hidup melampaui lease.

Referensi penguncian: [Laravel 13 Query Builder](https://laravel.com/docs/13.x/queries#pessimistic-locking); dispatch setelah commit: [Laravel Queues](https://laravel.com/docs/13.x/queues#jobs-and-database-transactions).
