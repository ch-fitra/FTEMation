# Keputusan hasil final assessment

Tanggal review: 11 November 2026 (Asia/Jakarta).

## Hasil yang dipilih

Hasil final pengumpulan menggunakan **Run #1 / Import #1**, model tersimpan dan aktual `deepseek-flash`, prompt **activity-v1 / summary-v1**, selesai 11 November 2026 pukul 16:01:23 WIB. Workbook: `samples/FTEMation_Workload_Dataset_v1.xlsx`, 60 aktivitas, 12 karyawan, 3 departemen. Run #4 dengan 90 aktivitas merupakan pengujian alternatif dan tidak termasuk pasangan final ini.

Run #1 dipilih karena berasal dari workbook utama yang tersedia, mencakup seluruh aktivitas dan kesimpulan, serta memiliki metadata provider (13 request, 28.171 input token, 14.891 output token, tanpa cache aktivitas). Audit ini membaca hasil tersimpan dan tidak mengulang request provider. Metadata historis bukan verifikasi independen terhadap server provider.

Kode aplikasi sekarang menggunakan prompt v2 untuk run baru. **Hasil final ini tetap v1**. Tidak ada klaim bahwa efektivitas reasoning v2 telah terbukti melalui inference nyata. Fake-provider tests v2 membuktikan kontrak/pipeline, bukan akurasi prediksi. Tidak ada label, rekomendasi, fixture, konfigurasi default, atau histori database yang dikoreksi dalam finalisasi ini.

## Review perbedaan evaluasi

Referensi: workbook `samples/FTEMation_AI_Evaluation_v1.xlsx`, sheet Evaluation dan GroupingPairs; dibandingkan dengan deskripsi asli, alasan/faktor hasil Run #1 dan rubrik prompt v1. Referensi bersifat sintetis, bukan ground truth ahli domain. Review ini adalah penilaian berbasis bukti teks oleh agen, bukan persetujuan pemilik proses. Metrik tetap dilaporkan apa adanya: **13/15 level**, **15/15 kategori** pada sampel Evaluation, **15/16 pasangan grouping**. Keputusan review tidak menaikkan hitungan tersebut.

### ACT-0002: referensi Medium, AI High

Input menyebut pencocokan nomor PO, harga satuan, pajak dan kuantitas dengan data PO di ERP; selisih diklarifikasi ke pembelian. AI memilih High karena matching terstruktur dan mempertahankan keputusan koreksi manusia; oversight=true, risk=medium, judgment=low.

**Keputusan: High diterima secara bersyarat sebagai interpretasi mayoritas langkah matching yang dapat diotomasi.** Keberadaan exception tidak otomatis mewajibkan Medium. Namun, input tidak menyebut proporsi/waktu exception atau tingkat keberhasilan matching. Klaim bahwa mayoritas waktu benar-benar dapat dihemat belum terbukti. Medium pada fixture juga masuk akal bila investigasi selisih menghabiskan bagian signifikan waktu. Label historis dipertahankan; saving 60% tetap asumsi skenario, bukan hasil pengukuran.

Ada kelemahan rekomendasi terpisah: AI menyebut "pencocokan tiga arah", sementara input hanya membuktikan invoice dan PO. **Bagian rekomendasi tersebut tidak diterima sebagai rancangan implementasi siap pakai.** Ruang lingkup yang didukung input adalah two-way matching invoice-PO; three-way matching hanya opsi setelah ketersediaan data penerimaan barang dikonfirmasi. Rekomendasi mentah tetap utuh pada results.json untuk menjaga provenance; penjelasan koreksi ruang lingkup berada dalam dokumen review ini.

Data yang diperlukan sebelum implementasi: dokumen/sumber ketiga bila diusulkan, aturan matching yang disetujui, proporsi exception, waktu klarifikasi, dan pihak pemberi persetujuan. Tidak ada data tersebut yang diciptakan untuk membenarkan High.

### ACT-0007: referensi Medium, AI High

Input menyebut matching nominal/referensi mutasi bank terhadap penerimaan ERP; pembayaran parsial dan transaksi tanpa referensi ditangani manual. AI memberi High dengan judgment=medium, risk=high dan oversight=true; rekomendasinya mempertahankan review manusia atas penyelesaian transaksi ambigu.

**Keputusan: High dipertahankan sebagai skenario otomasi langkah matching, dengan ketidakpastian lebih besar daripada ACT-0002.** Risk tinggi tidak otomatis berarti Low/Medium jika keputusan finansial tetap manusia, tetapi input tidak membuktikan bahwa langkah otomatis mendominasi waktu. Referensi Medium adalah interpretasi konservatif yang dapat diterima. Review belum menyelesaikan pilihan empiris High versus Medium karena jumlah dan durasi kasus ambigu tidak tersedia. Tidak ada dasar untuk mengganti label historis secara manual atau mengklaim High sudah tervalidasi operasional.

Kontrol wajib: manusia menyetujui penyelesaian item tak teridentifikasi, pembayaran parsial dan transaksi tanpa referensi; otomasi tidak diberi kewenangan settlement/keputusan finansial. Saving 60% merupakan asumsi menurut label yang tersimpan. Sebelum implementasi, ukur cakupan automatic matching dan waktu exception untuk mengkalibrasi estimasi.

### ACT-0009 dan ACT-0039: referensi sama, hasil berbeda

ACT-0009 secara eksplisit mengekspor saldo, membuat bucket aging dan menyusun laporan mingguan; `periodic_reporting` sesuai mekanisme dominannya. ACT-0039 berpusat pada CHRO yang memverifikasi perubahan signifikan, membandingkan headcount dengan rencana tenaga kerja dan mengarahkan koreksi; laporan justru disiapkan HRIS/HR. `data_reconciliation` merupakan pilihan yang dapat dipertanggungjawabkan untuk bagian pembandingan/selisih, meskipun aktivitas ini juga mengandung judgment pimpinan yang tidak seluruhnya ditangkap satu kategori.

**Keputusan: perbedaan grup diterima berdasarkan perbedaan pekerjaan dominan dalam deskripsi, bukan nama laporan.** Kesamaan konteks laporan periodik tidak cukup untuk mewajibkan satu grup. Pasangan fixture ditandai sebagai referensi yang ambigu terhadap deskripsi; fixture asli dan hasil AI tidak diubah. Nilai pasangan tetap **15/16**, tidak dinyatakan menjadi 16/16. Perubahan fixture kelak memerlukan review pemilik domain dan versi fixture baru.

## Dampak dan batas penerimaan

Review selesai dengan keputusan mempertahankan hasil mentah v1 dan menyertakan batas bukti. Tidak ada klaim seluruh label benar atau seluruh rekomendasi siap dieksekusi. Penerimaan untuk pengumpulan berarti hasil lengkap, dapat ditelusuri dan disertai review terbuka. Validasi empiris label serta realisasi saving tetap memerlukan data proses, bukan penggantian label untuk mencocokkan fixture.

Sebagai ilustrasi sensitivitas khusus dua perbedaan level: jika ACT-0002 dan ACT-0007 sama-sama memakai asumsi Medium 30%, estimasi total saving menjadi **1,5812291667 FTE**, dibanding skenario hasil tersimpan **1,6724791667 FTE** (selisih **0,09125 FTE**). Ini perhitungan pembanding dalam review, bukan hasil AI baru, bukan perubahan results.json, dan bukan fitur What-If aplikasi.

## Pasangan berkas final dan verifikasi

Folder final: `../FTEMation-Archive-2026-11-11/submission/final-run-1/`.

- `FTEMation_Workload_Dataset_v1.xlsx`: salinan byte-identik workbook utama dan upload Import #1.
- `results.json`: dihasilkan oleh `AnalysisReportService` dan `AnalysisExportService` aplikasi dari Run #1 setelah `assertComplete`; tanpa edit manual jawaban AI.
- `manifest.json`: versi, identitas run/import, metrik, hasil pemeriksaan dan SHA-256 pasangan berkas.
- `FINAL_ASSESSMENT_REVIEW.md`: keputusan versi, alasan perbedaan dan batas interpretasi.

Pemeriksaan mencakup semua sembilan field input per activity_id, tepat 60 ID unik sukses, 12 karyawan/3 departemen, kesimpulan lengkap, kalkulasi FTE/saving dari snapshot, anggota grup tepat sekali, field wajib JSON, pembulatan enam desimal, kecocokan byte export aplikasi dan checksum workbook sumber/upload/salinan. Total FTE **4,4671875**, saving **1,6724791667**, remaining **2,7947083333**; distribusi High/Medium/Low **21/24/15**. Export membulatkan angka menjadi enam desimal setelah agregasi sehingga penjumlahan angka baris yang telah dibulatkan dapat sedikit berbeda dari total.

Reproduksi: `php scripts/prepare-final-assessment.php`. Skrip hanya membaca database dan menulis folder final baru; tidak memanggil provider/queue, tidak menimpa export historis, dan menolak menimpa folder final yang sudah ada. Untuk pemeriksaan ulang folder yang sudah dibuat, bandingkan hash berkas terhadap manifest dan export JSON read-only aplikasi. Jangan menghapus folder final hanya untuk mengulang skrip.

Saat demo, pilih dataset 60 aktivitas dan Run #1 di Hasil analisis. Narasi yang tepat: "Hasil final ini memakai DeepSeek dengan prompt v1, mencakup 60 aktivitas. FTE, estimasi saving dan prioritas dihitung Laravel. Perbedaan dengan referensi ditinjau berdasarkan konteks aktivitas dan dicatat dalam review. Prompt v2 tersedia untuk run baru, tetapi hasil final ini tidak diklaim sebagai hasil v2."

Folder ini hanya menyiapkan pasangan dataset/hasil serta bukti review; bukan klaim seluruh paket penyerahan, keamanan aplikasi atau deployment sudah selesai.
