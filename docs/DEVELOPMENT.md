# FTEMation — Panduan developer

## Mulai di sini

1. [README](../README.md): instalasi Windows, akun demo, dan cara menjalankan Laravel/Vite.
2. [AGENTS.md](../AGENTS.md), [keputusan teknis](TECH_STACK_DECISIONS_v1.1.md), dan [PRD](PRD_v1.1.md): aturan serta acceptance criteria.
3. Panduan ini: lokasi kode dan alur aplikasi. [Roadmap](ROADMAP.md): fitur yang belum selesai.

Laravel berada di root, React di `frontend/`. Build React disajikan Laravel pada `/`, `/imports`, dan `/activities`; Vite development mem-proxy `/api` dan `/sanctum` ke Laravel.

## Struktur folder

```text
FTE-Mation/
├── app/
│   ├── Http/Controllers/      # Endpoint REST: auth dan import
│   ├── Http/Requests/         # Validasi request/form upload
│   ├── Models/                # Tujuh model Eloquent beserta relasi
│   ├── Providers/             # Registrasi layanan dan rate limiter
│   └── Services/Workload/     # Import, workbook validation, FTE, agregasi
├── bootstrap/                # Bootstrap, middleware, registrasi routing
├── config/                   # Konfigurasi Laravel dan ftemation.php
├── database/
│   ├── data/                 # Taksonomi grouping untuk seeder
│   ├── factories/            # Data pengguna untuk tes
│   ├── migrations/           # Riwayat schema database
│   └── seeders/              # Akun demo dan 20 kategori
├── frontend/
│   ├── src/
│   │   ├── main.tsx          # Entry React dan CSS
│   │   ├── app/              # App/auth gate dan definisi navigasi
│   │   ├── assets/brand/     # Logo FTEMation yang dibundel Vite
│   │   ├── pages/            # LoginPage, OverviewPage, ImportsPage, ActivitiesPage
│   │   ├── layouts/          # WorkspaceLayout, Header, Sidebar
│   │   ├── components/       # ErrorAlert, Pagination, MetricCard
│   │   ├── hooks/            # useSession, useWorkload
│   │   ├── lib/              # Axios, error handling, format tampilan
│   │   ├── types/            # Kontrak API: auth, workload, pagination
│   │   └── styles/           # CSS base, layout, halaman, responsif
│   ├── index.html            # Entry HTML Vite
│   └── vite.config.ts        # Proxy, base URL, output build
├── routes/                   # web.php, api.php, console.php
├── tests/Unit/               # Rumus domain
├── tests/Feature/            # Auth, import, isolasi data, routing SPA
├── scripts/                  # Smoke HTTP lokal
├── docs/                     # Spesifikasi, ERD, panduan, laporan, roadmap
├── references/               # Studi kasus asli PDF/TXT
├── samples/                  # Workbook workload dan evaluasi AI
├── public/                   # Entry HTTP dan build React public/build
├── storage/                  # Upload privat, log, cache/runtime Laravel
├── vendor/                   # Dependency Composer terpasang
├── .env                      # Konfigurasi/rahasia lokal, diabaikan Git
├── .env.example              # Template tanpa rahasia
├── composer.json             # Dependency dan perintah backend
├── package.json              # Shortcut npm root ke frontend
├── phpunit.xml               # Tes SQLite in-memory
└── README.md                 # Titik masuk dokumentasi
```

## Alur program

Frontend: `main.tsx` → `app/App.tsx` → `useSession`. Saat pemeriksaan sesi berlangsung, SessionLoading menampilkan indikator netral tanpa workspace. Respons 401 menampilkan LoginPage; sesi valid menampilkan WorkspaceLayout. Layout merender header/sidebar dan halaman sesuai React Router. `app/navigation.ts` menjadi satu sumber label menu serta judul header. Jangan merender kerangka workspace dari pathname sebelum sesi terverifikasi.

Login menggunakan URL `/`. Cabang guest pada App mengalihkan path lain ke `/` melalui React Router dengan `replace`, termasuk setelah logout atau sesi kedaluwarsa. Login tidak boleh sekadar mengganti komponen di URL halaman privat. Sesi yang masih valid tetap dapat membuka deep link workspace.

`useWorkload` menangani dataset terpilih, riwayat, refresh, dan summary bersama. State form/filter tetap di halaman. `lib/http.ts` menyediakan Axios cookie/CSRF dan pesan error. `lib/format.ts` hanya memformat angka/tanggal.

Backend: route → middleware session/CSRF/auth/throttle → Form Request → controller → service → transaksi Eloquent/file privat → JSON. Login/logout berada di web.php; API data menggunakan auth:sanctum di api.php.

| Class di app/Services/Workload | Tugas |
|---|---|
| WorkloadWorkbookReader | Sheet/header, normalisasi, validasi baris, batas workbook |
| WorkloadImportService | File privat, status audit, transaksi employees/activities |
| FteCalculator | FTE, baseline saving, skor prioritas deterministik |
| WorkloadSummaryService | Agregasi satu import sebelum pembulatan tampilan |

Upload: ImportsPage → POST /api/imports → ImportWorkloadRequest → ImportController → WorkloadImportService → reader/calculator → transaksi → summary → Overview. Import gagal tidak menyisakan workload parsial; audit failed dan file privat tetap tersedia.

## Lokasi perubahan

- Menu/judul: `frontend/src/app/navigation.ts`.
- Header/sidebar: `frontend/src/layouts/WorkspaceHeader.tsx` dan WorkspaceSidebar.tsx.
- Logo: `frontend/src/assets/brand/ftemation-logo.webp` (492×328, 7.610 byte), digunakan melalui `components/BrandLogo.tsx`. Favicon simbol tanpa tulisan adalah `assets/brand/ftemation-mark.svg`; keduanya dibundel Vite. Gambar sumber di Downloads tidak diubah.
- Isi halaman: `frontend/src/pages/`; komponen yang dipakai bersama: `components/`.
- State sesi/dataset: `hooks/`; client API dan format: `lib/`; tipe respons: `types/`.
- Popup sesi: `components/SessionDialog.tsx`; alur masuk di `pages/LoginPage.tsx`, konfirmasi keluar di `layouts/WorkspaceLayout.tsx`.
- CSS: `styles/index.css` memuat base → login → layout → workload → session-dialog → responsive.
- Endpoint/validasi HTTP: `routes/`, `app/Http/Controllers/`, `app/Http/Requests/`.
- Aturan workbook/rumus: `app/Services/Workload/` dan `config/ftemation.php`.
- Perubahan schema: migration baru; jangan mengganti nama migration yang sudah dijalankan.

Perilaku UI: judul sesuai halaman, header ringkas dan sticky, tombol import di header hanya pada Import dataset, identitas pengguna hanya pada Overview, serta tombol Keluar di bawah sidebar navy. Pada layar kecil tombol Keluar berada di area navigasi atas. Kartu Dataset Aktif tidak ditampilkan. Palet, popup sesi, dan pemeriksaan visual dijelaskan di [panduan tampilan UI](UI_DESIGN.md).

## Pembersihan dan file yang diperlukan

Salinan starter kit, prompt setup lama, aset contoh Vite, README template, implementasi frontend/service lama, tes ExampleTest, dan CSS sisa sudah dihapus. Rencana lanjutan berada di ROADMAP.md. Jangan membuat folder old/backup/copy dalam repository; gunakan version control.

File mirip berikut memiliki fungsi berbeda dan tetap diperlukan:

- Studi kasus PDF/TXT dan ERD mmd/png: sumber asli, versi terbaca, serta gambar deliverable.
- Workbook workload dan evaluasi AI: input dan referensi evaluasi.
- group_taxonomy.json: data runtime seeder, agar seeder tidak perlu Python atau label jawaban evaluasi.
- Model analisis serta DomPDF: schema/stack wajib fase selanjutnya.
- Lock Composer/npm dan folder vendor/node_modules: dependency backend/frontend.
- Konfigurasi Laravel serta placeholder storage: dibaca framework secara implisit.

`.env`, upload privat, referensi, workbook, dan database dipertahankan. Cache PHPUnit disimpan di `storage/framework/testing/phpunit/`; build Vite membersihkan output lama di `public/build/`. File generated/dependency bukan source dan diabaikan Git.

## Pengujian

```powershell
composer test
php vendor/bin/pint --test
npm run build
npm run lint
composer validate --no-check-publish
composer check-platform-reqs
php artisan ftemation:check-database
node scripts/smoke-http.mjs
```

PHPUnit memakai SQLite in-memory. Smoke HTTP memakai sesi nyata dan, tanpa --import, tidak menambah dataset. Jangan menjalankan migrate:fresh pada database lokal berisi data. Verifikasi visual browser perlu dilakukan terpisah dari build/lint/HTTP.

Verifikasi setelah pemulihan Undo (11 November 2026): 36 tes/169 assertion lulus; build, lint, Pint, validasi Composer, koneksi database, dan 23 pemeriksaan smoke HTTP lulus. Audit menemukan 26 file frontend terjangkau tanpa import putus, tidak ada source duplikat byte-identik, dan seluruh tautan dokumentasi lokal valid. Fingerprint .env, referensi, workbook, serta upload tersimpan tidak berubah.
