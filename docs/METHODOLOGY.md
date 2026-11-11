# Metodologi FTEMation

Dokumen ini menjelaskan implementasi aktif setelah penyempurnaan 11 November 2026. Dokumen metodologi historis yang diminta tidak ditemukan pada proyek maupun lokasi arsip yang tercantum README; ini bukan salinan arsip.

## Angka deterministik

Laravel menghitung `fte = volume * duration_minutes * annual_factor / annual_capacity_minutes`, `saving = fte * saving_rate`, `remaining = fte - saving`. Faktor tahunan daily/weekly/monthly adalah 240/48/12 dan kapasitas 115200 menit. Saving high/medium/low memakai 0.6/0.3/0.1. Priority adalah `100 * saving/maxSavingRun * riskFactor * effortFactor`; nol bila maksimum nol. Semua parameter dibaca dari snapshot run, agregasi sebelum pembulatan; export enam desimal. Prompt tidak menghitung angka ini.

FTE di atas satu tidak dibatasi atau dianggap error. Dashboard dan kartu individu memberi catatan verifikasi volume, periode, pembagian pekerjaan, durasi dan kapasitas tahunan. Cuplikan aktivitas sintetis tidak membuktikan overload aktual, produktivitas atau kebutuhan headcount. Saving belum merupakan efisiensi operasional yang terealisasi maupun keputusan pengurangan pegawai.

## Rubrik dan bukti AI

High mencakup mayoritas langkah berulang dan terstruktur; Medium mengotomatisasi sebagian langkah dengan review/exception kontekstual signifikan; Low mempertahankan judgment/keputusan final manusia. Lima faktor dan scope tetap memakai schema lama. Grouping memilih mekanisme dominan dari taksonomi, bukan nama pekerjaan atau departemen.

V2 menambahkan batas bukti: dokumen, field, database, integrasi, SOP, threshold dan toleransi yang belum disebutkan harus dikonfirmasi. Opsi tambahan harus bersyarat. Contoh: mulai matching invoice dan PO; perluasan three-way bergantung pada penerimaan barang yang tervalidasi. Narasi kesimpulan juga tidak boleh menaikkan rekomendasi AI menjadi fakta kesiapan sistem.

Level berbeda dalam grup yang sama diperbolehkan. Alasan harus menjelaskan faktor yang didukung input. Jika informasi kurang, prompt meminta frasa “Perlu review pemilik proses” dan informasi yang dibutuhkan. Advisory hanya menampilkan grup dengan level berbeda dan alasan/faktor aslinya, tanpa mengubah label, saving, grouping atau urutan prioritas. Advisory tidak membuktikan kesamaan semantik dan tidak menemukan semua inkonsistensi, termasuk lintas kategori atau label sama yang sama-sama keliru.

## Human oversight dengan boolean kompatibel

| Konsep | Makna | Representasi |
|---|---|---|
| Routine human approval | Persetujuan sebelum setiap transaksi/eksekusi | true, peran dan langkah pada catatan |
| Exception review | Alur normal otomatis; kasus di luar kriteria ke manusia | false diperbolehkan hanya jika tidak ada aturan wajib risiko/judgment tinggi; pemicu/peran dijelaskan |
| Human decision required | Kewenangan keputusan final tetap manusia | true, otoritas final pada catatan |

Boolean tidak cukup untuk menentukan jenis kontrol secara pasti, khususnya run v1. UI/PDF/Overview menjelaskan keterbatasan itu dan menampilkan rekomendasi/catatan. Tidak ada ekstraksi semantik yang mengklaim dapat memastikan ketiga kategori dari teks bebas. False tidak dikonversi menjadi true. Keputusan finansial, perubahan rekening, rekrutmen dan keselamatan harus mempertahankan otoritas manusia; validator tetap menolak faktor risk/judgment tinggi atau high_impact_decision tanpa kontrol. Validator tidak memahami setiap konteks finansial dari teks.

## Histori dan export

Activity-v1 dan summary-v1 tetap tersedia. Snapshot prompt/model/taksonomi/perhitungan melekat ke run; hanya start baru memakai konfigurasi v2. Cache mengikuti fingerprint isi prompt. Retry/resume memakai snapshot lama. Tidak ada migration, penulisan ulang hasil, invalidasi cache historis manual, atau perubahan formula.

JSON wajib tetap kompatibel; advisory berada di luar `report` pada respons detail run dan tidak dimasukkan ke results.json. Overview baru memakai metadata, KPI, distribusi dan panduan; enam sheet lama tetap tersedia. Activities mempertahankan urutan kolom serta nilai, dengan format angka dan freeze/filter. Teks ditulis eksplisit sebagai string agar tidak dieksekusi sebagai formula. Export baru dari run lama tetap berlabel v1, meskipun tata letak export memakai kode terbaru; artefak yang sudah tersimpan tidak otomatis diperbarui.
