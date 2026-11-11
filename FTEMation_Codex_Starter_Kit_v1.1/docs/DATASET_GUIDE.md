# FTEMation — Dataset Guide (v1.0)

## Isi paket

1. `FTEMation_Workload_Dataset_v1.xlsx` — **dataset utama untuk import Laravel**, satu sheet `Workload` berisi **60 aktivitas / 12 karyawan / 3 departemen** dengan **sembilan kolom wajib**.
2. `FTEMation_AI_Evaluation_v1.xlsx` — dokumen evaluasi terpisah, bukan input aplikasi:
   - `Evaluation`: 15 aktivitas dengan label referensi awal (5 high, 5 medium, 5 low), alasan, dan catatan evaluasi.
   - `GroupingPairs`: 16 pasangan aktivitas, 8 diharapkan tergabung dan 8 diharapkan berbeda.
   - `GroupTaxonomy`: 20 kategori referensi untuk semantic grouping.
3. `FTEMation_Dataset_Guide.md` — dokumen ini.

## Konteks data

Dataset **sintetis/fiktif**, dibuat untuk demonstrasi bisnis manufaktur dan distribusi FMCG. **Bukan** data pegawai, transaksi, atau operasi internal Tancorp. Nama seluruh karyawan fiktif.

- Finance & Accounting: FIN-001 (Staff Finance), FIN-002 (Staff Piutang), FIN-003 (Staff Accounting), FIN-004 (CFO)
- Human Resources: HR-001 (Staff HR), HR-002 (Staff Payroll), HR-003 (Staff Rekrutmen), HR-004 (CHRO)
- Operations: OPS-001 (Staff Gudang), OPS-002 (Staff Logistik), OPS-003 (Staff Pembelian), OPS-004 (COO)

Per karyawan ada lima aktivitas. Lima aktivitas ini **hanya cuplikan pekerjaan**, bukan keseluruhan beban kerja karyawan.

## Struktur input wajib

Kolom workbook `Workload` **harus dibaca mulai baris 1**:

`activity_id`, `employee_id`, `employee_name`, `department`, `activity_name`, `description`, `frequency`, `volume`, `duration_minutes`

- `activity_id`: ACT-0001 sampai ACT-0060 (unik).
- `employee_id`: 12 kode karyawan unik, masing-masing lima aktivitas.
- `frequency`: hanya `daily`, `weekly`, atau `monthly`.
- `volume`: jumlah unit aktivitas **per periode**.
- `duration_minutes`: rata-rata menit untuk **satu unit aktivitas**.
- Kolom `job_title`, `automation_level`, dan `group_id` sengaja **tidak dimasukkan** ke dataset utama agar sesuai sembilan kolom wajib dan tidak membocorkan hasil AI.

## Asumsi dan perhitungan FTE acuan

- 240 hari efektif kerja per tahun.
- 8 jam efektif per hari.
- Penyebut kapasitas: 240 × 8 × 60 = **115.200 menit/tahun**.
- Faktor frekuensi: `daily` = 240, `weekly` = 48, `monthly` = 12.
- Rumus: `fte = volume × duration_minutes × annual_factor / 115200`.
- Perhitungan dilakukan oleh **Laravel**, bukan oleh AI ataupun formula tersimpan di Excel input.

### Hasil pemeriksaan FTE dataset v1

| Departemen | Jumlah aktivitas | FTE aktivitas (lebih presisi) |
|---|---:|---:|
| Finance & Accounting | 20 | 1.479375 |
| Human Resources | 20 | 0.948646 |
| Operations | 20 | 2.039167 |
| **Total** | **60** | **4.467188** |

Angka FTE di atas adalah **hasil audit/perhitungan data sintetis** untuk verifikasi, bukan angka penghematan otomatisasi. Perbedaannya dari asumsi awal sebelum peran CFO, CHRO, dan COO disesuaikan merupakan hal yang disengaja.

Komposisi frekuensi: **15 daily, 32 weekly, 13 monthly**.

## Aturan AI dan evaluasi

Dataset utama tidak mengandung label jawaban. Gunakan kolom nama dan deskripsi aktivitas untuk LLM inference, lalu Laravel:
1. Memvalidasi struktur output AI.
2. Menghitung FTE dan estimated FTE saving secara deterministik.
3. Menyimpan hasil dan `group_id` dalam database.
4. Membentuk `results.json` dari hasil yang tersimpan.

Referensi dalam workbook evaluasi adalah **rubrik awal yang disusun manual**, bukan ground truth empiris atau hasil pengujian model. Label itu perlu direview dan hanya digunakan untuk membandingkan kualitas hasil AI. Jangan mengirim label referensi sebagai bagian input klasifikasi.

Beberapa jenis grouping bersifat lintas departemen. Persamaan `group_id` menunjukkan **kesamaan mekanisme pekerjaan**, bukan kesamaan tingkat risiko atau peluang otomatisasi, dan tidak serta-merta berarti satu sistem otomasi identik dapat diterapkan di seluruh departemen.

## Quality gates

- Tepat 60 aktivitas.
- 12 karyawan × 5 aktivitas, 3 departemen × 20 aktivitas.
- Sembilan kolom Excel, tidak ada header tambahan atau row metadata.
- Unik `activity_id`; foreign key karyawan/nama/departemen konsisten.
- `volume` dan `duration_minutes` positif; `frequency` hanya satu dari tiga nilai.
- Excel input tanpa `automation_level`, `group_id`, hasil saving, dan tanpa sheet evaluasi.
- File evaluasi tidak boleh diimport sebagai data `Workload`.
- Setelah import Laravel, verifikasi jumlah 60 dan total FTE ~4.4671875 sesuai formula di atas sebelum pembulatan.

## Keselamatan penggunaan

Data ini hanyalah simulasi. Jangan menginterpretasikan nilai FTE yang diamati sebagai pengurangan headcount, atau label otomatisasi sebagai keputusan produksi tanpa validasi bisnis dan governance.
