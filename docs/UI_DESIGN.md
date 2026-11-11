# Tampilan dan pemeriksaan UI

## Arah visual

Tema mengadaptasi navy, biru, cyan, dan putih dari referensi visual [Tancorp](https://tancorp.id/). Nilai warna berikut adalah pilihan untuk aplikasi FTEMation, bukan klaim kode warna resmi Tancorp.

| Token di `frontend/src/styles/base.css` | Nilai | Penggunaan |
|---|---|---|
| `--navy` | `#071e45` | Navigasi aktif, kartu FTE utama, panel login |
| `--primary` | `#006eab` | Tombol dan tautan utama |
| `--accent` | `#00a8dc` | Aksen dan ikon pada latar gelap |
| `--text` | `#172e4d` | Teks utama |
| `--canvas` | `#f3f6fa` | Latar workspace |

Hierarki halaman menonjolkan angka workload, lalu perbandingan departemen dan metode perhitungan. Ikon SVG bersama berada di `components/Icon.tsx`. Logo pengguna tetap menjadi identitas aplikasi. Tidak ada data ilustrasi yang ditampilkan sebagai hasil AI.

CSS dibagi menurut tanggung jawab: `base.css` untuk token dan elemen dasar, `layout.css` untuk kerangka, `pages/` untuk halaman, dan `responsive.css` untuk penyesuaian ukuran layar. Seluruh styling menggunakan CSS biasa.

Sidebar memakai navy, teks terang, dan penanda menu aktif cyan. Identitas sidebar menggunakan simbol SVG yang sama dengan favicon serta wordmark teks putih. Header mengikuti judul halaman dan tetap di atas saat scroll, setinggi 64 px di desktop dan 58–60 px di layar kecil. Identitas pengguna hanya di Overview; tombol import pada header hanya di Import dataset. Keluar berada di bawah sidebar desktop dan tetap dapat dijangkau pada navigasi mobile. Strip Dataset Aktif tidak ditampilkan. Pada mobile, riwayat import menjadi kartu; tabel aktivitas tetap dapat digeser di dalam panel tanpa menggeser seluruh halaman.

## Mengulang pemeriksaan browser

Nyalakan MySQL dan Laravel, siapkan build terbaru serta dataset referensi yang sudah diimpor. Skrip mengasumsikan ACT-0001 dan ACT-0041 tersedia. Gunakan Chrome yang terpasang di Windows. Playwright dapat dipasang di folder sementara agar dependency aplikasi tidak bertambah:

```powershell
npm install --prefix "$env:TEMP/ftemation-ui-review" --no-save --package-lock=false playwright
npm run build
node scripts/review-ui.mjs
```

Opsional: `UI_BASE_URL` untuk origin lokal lain dan `PLAYWRIGHT_REVIEW_ROOT` untuk lokasi instalasi Playwright. Skrip hanya menerima localhost/127.0.0.1. Kredensial demo dibaca dari environment atau `.env` tanpa dicetak. Chrome berjalan headless dalam context terisolasi.

Pemeriksaan mencakup login session, judul/header, overflow, filter, pencarian, pagination, rincian FTE, penolakan file tidak valid di frontend, serta posisi header saat scroll. Skrip tidak melakukan import baru atau request AI. Screenshot dan laporan disimpan privat di `storage/app/private/ui-review/after/`, diabaikan Git. Screenshot dapat memuat data workload, sehingga jangan dipublikasikan tanpa meninjau isinya.

## URL, aset, dan perilaku pemuatan

URL workspace adalah `/`, `/imports`, dan `/activities`. BrowserRouter tidak memakai basename. URL lama `/app`, `/app/imports`, dan `/app/activities` dialihkan ke URL baru. Laravel hanya menyajikan entry React untuk halaman tersebut; API dan URL tidak dikenal tetap mengikuti routing backend.

Ketika sesi kosong, URL login adalah `/`. Path workspace diarahkan ke `/` dengan `replace` setelah pemeriksaan sesi; ini juga berlaku setelah logout dan respons 401. Logout berhasil dari `/activities` atau `/imports` tidak lagi meninggalkan URL privat saat form login sudah tampil. Batal atau gagal logout mempertahankan URL semula.

Regresi pengalihan logout: build/lint, 20 pemeriksaan sesi, dan 28 pemeriksaan refresh lulus pada 11 November 2026. Browser menguji logout dari Data aktivitas dan Import, penutupan sukses otomatis maupun lewat OK, refresh pada login, serta tombol Back yang tidak memulihkan workspace tanpa sesi. Tidak ada error JavaScript terdeteksi.

Vite menyimpan build di `public/build/`, dengan URL aset `/build/assets/`. Ini merupakan lokasi aset, bukan awalan URL halaman. Folder build lama `public/app/` sudah dibersihkan. Untuk development Vite, buka `http://localhost:5173/`; build Laravel dibuka pada `http://localhost:8000/`.

Logo aplikasi diperkecil dari PNG 1.084.447 byte menjadi WebP 492?328 sebesar 7.610 byte (99,3% lebih kecil). Tampilan terbesar saat ini 164 CSS pixel, sehingga resolusi tersebut mendukung hingga 3? kepadatan pixel. Logo asli di Downloads tetap tersedia. Favicon menggunakan SVG transparan berisi simbol saja, tanpa tulisan dan tanpa bidang kotak putih. `frontend/index.html` merujuk aset yang di-hash Vite agar cache mengikuti versi file.

`SessionLoading` menampilkan indikator netral saat sesi diperiksa, tanpa sidebar, judul halaman, atau request dataset. Workspace baru dirender setelah `/api/user` berhasil. URL sebelumnya bukan bukti autentikasi; tampilan workspace tidak dibangun dari pathname atau penanda browser. Setelah pengguna terverifikasi, `WorkspacePlaceholder` menyesuaikan susunan Overview, Import, atau Data aktivitas. Riwayat import selesai lebih dulu daripada ringkasan; `useWorkload` tetap loading hingga ringkasan tersedia. Pesan dataset kosong hanya tampil setelah request selesai. Saat filter/pagination aktivitas berjalan, tabel lama tetap terlihat dengan `aria-busy` dan tampilan redup, sehingga panel tidak runtuh menjadi satu baris teks.

CSS memakai tema kontrol terang, warna scrollbar abu-abu biru, dan `scrollbar-gutter: stable` pada root. Ruang scrollbar disediakan sejak awal agar lebar konten tidak berubah ketika halaman memanjang. Perilaku gutter dan styling mengikuti [CSS Overflow](https://www.w3.org/TR/css-overflow-3/#scrollbar-gutter-property) serta [CSS Scrollbars](https://www.w3.org/TR/css-scrollbars-1/). Mode forced colors tetap mengikuti browser untuk aksesibilitas.

`public/index.php` menormalkan metadata front controller hanya pada server development PHP. Ini mencegah nested index HTML dianggap sebagai base URL Laravel. [Manual PHP](https://www.php.net/manual/en/features.commandline.webserver.php) menjelaskan pencarian index pada server tersebut.

## Verifikasi 11 November 2026

- Build TypeScript/Vite, lint frontend, dan Pint untuk PHP yang berubah berhasil.
- 41 tes PHPUnit lulus, 190 assertion; database tes SQLite in-memory.
- 31 pemeriksaan HTTP lulus, termasuk URL langsung `/imports` dan `/activities`, aset JavaScript, cookie/CSRF, dan API tidak dikenal tetap 404.
- 37 pemeriksaan browser lulus tanpa error JavaScript: login, Overview, Import, dan Data aktivitas pada desktop 1440?1000, tablet 900?1000, mobile 390?844; Overview juga pada 1920?1080.
- 28 pemeriksaan refresh/pemuatan lulus tanpa error JavaScript. Pembukaan langsung dan refresh tamu pada ketiga URL diuji di desktop/mobile dengan respons sesi ditahan: tidak ada workspace yang dirender atau request dataset. Pemeriksaan lain mencakup placeholder setelah sesi valid, lebar layout, preferensi sistem gelap dengan UI terang, tabel tetap terlihat ketika filter dimuat, dan favicon SVG tanpa teks di bawah 2 KB.
- Screenshot placeholder dan halaman selesai pada desktop/mobile, logo WebP, serta simbol favicon pada ukuran 16/32/64/128 pixel ditinjau langsung.

Ulangi regresi refresh dengan `node scripts/review-refresh.mjs` setelah server dan dataset referensi tersedia. Skenario error ringkasan dan riwayat kosong disimulasikan melalui intercept browser. Skrip tidak menambah import atau memanggil AI. Screenshot tahap pemuatan dan laporan disimpan di `storage/app/private/ui-review/refresh/`.

Pemeriksaan menggunakan Chrome lokal. Bentuk scrollbar dapat mengikuti kebijakan browser/OS, terutama overlay scrollbar dan mode forced colors; hasil ini bukan audit semua browser atau audit aksesibilitas formal.

## Popup masuk dan keluar

`components/SessionDialog.tsx` memakai elemen dialog native, focus containment, label/deskripsi aksesibel, serta pemulihan fokus ke tombol pemicu. Background tidak dapat dioperasikan dan scroll halaman dikunci selama popup aktif. CSS spinner berada di `styles/session-dialog.css`, tanpa dependency animasi tambahan.

Tampilan popup mengikuti referensi SIAKAD yang diberikan pengguna: ikon lingkaran, judul/pesan terpusat, tanpa header identitas atau footer dekoratif. Ikon konfirmasi oranye, sukses hijau, dan gagal merah. Tombol Yakin/OK berwarna hijau dengan kontras teks putih; Batal putih dengan garis tepi. Lebar maksimal 460 px di desktop dan 340 px di layar hingga 768 px, tetap dibatasi viewport. Backdrop abu-abu tanpa blur. Animasi fade 120 ms dinonaktifkan pada reduced motion. Implementasi tetap menggunakan dialog native dan CSS biasa.

Keluar: konfirmasi Yakin/Batal dengan fokus awal Batal → request logout dan spinner → sukses hanya setelah respons server → kembali ke login otomatis setelah 1,1 detik atau lewat OK. Batal/Escape pada konfirmasi tidak mengirim request. Escape dan klik di luar tidak menutup proses yang sedang berjalan. Request gagal menampilkan pesan dan OK, serta mempertahankan workspace.

Masuk: submit form → tombol Memproses dan isian dinonaktifkan selama CSRF/login, tanpa popup loading → popup sukses setelah server menerima kredensial → membuka workspace otomatis setelah 1,1 detik tanpa tombol tambahan. Kredensial ditolak menampilkan pesan error dan OK, lalu form dapat digunakan kembali. Spinner logout mengikuti request, tanpa durasi minimum atau persentase kemajuan palsu.

Jalankan `node scripts/review-session.mjs` menggunakan Playwright lokal yang sama. Pada 11 November 2026, 16 pemeriksaan desktop/mobile lulus tanpa error JavaScript, termasuk failure yang disimulasikan, cancel, Escape, fokus, spinner, keberhasilan sesi nyata, serta logout yang membuat `/api/user` kembali 401. Screenshot berada di `storage/app/private/ui-review/session/`. Pemeriksaan tampilan umum juga lulus 37 pemeriksaan setelah perubahan sidebar/header, termasuk tombol import tidak tampil pada Data aktivitas.

## Login yang ringkas dan responsif

Judul tab hanya `FTEMation`. Panah dekoratif di sisi kanan tombol Keluar dihapus. Login berisi logo/judul terpusat, email, password, dan tombol navy `Masuk`; deskripsi form, catatan akses demo, serta footer human oversight pada login tidak ditampilkan. Aturan oversight pada domain aplikasi tetap berlaku.

Login menempati viewport dengan `position: fixed` dan `100dvh`, tanpa scroll dokumen. Panel cerita disembunyikan pada layar sempit. Layar landscape pendek memakai identitas dan form berdampingan agar input/tombol tetap terjangkau; portrait pendek memakai jarak serta logo lebih ringkas. Area form memiliki fallback overflow untuk viewport ekstrem atau keyboard virtual agar kontrol tidak terpotong. Aturan login terkumpul di `styles/pages/login.css`.

Gunakan `node scripts/review-responsive.mjs` untuk memeriksa login dan tiga halaman workspace pada 12 viewport dari 320×480 sampai 2560×1440, termasuk 568×320 serta 844×390. Skrip memeriksa scroll dokumen/form login, logo terpusat, tombol berada dalam viewport, judul tab, teks yang dihapus, overflow horizontal, tombol Keluar, dan visibilitas tombol import per halaman. Screenshot disimpan privat di `storage/app/private/ui-review/responsive/`.

Verifikasi setelah penyederhanaan login (11 November 2026): build dan lint lulus; 48 pemeriksaan responsif pada 12 viewport dan 16 pemeriksaan sesi lulus, tanpa error JavaScript. Screenshot portrait kecil, tablet, landscape, dan desktop ditinjau langsung. Keyboard virtual perangkat fisik dan browser selain Chrome belum diuji.

Verifikasi setelah perbaikan flash workspace dan pembaruan popup: build/lint, 28 pemeriksaan refresh, 16 pemeriksaan popup/sesi, dan 37 pemeriksaan UI lulus. Rekaman pengguna memperlihatkan placeholder aktivitas sebelum login; regresi kini mengamati perubahan DOM sejak awal dokumen agar kemunculan sesaat tersebut ikut terdeteksi. Pengujian layout memakai satu sesi server yang sah untuk beberapa viewport, sedangkan login/logout nyata diuji terpisah oleh suite sesi, sehingga tidak perlu menghabiskan batas percobaan login hanya untuk menangkap screenshot.
