# Review kualitas AI tersimpan

11 November 2026. Sumber: completed run #1, export aplikasi `results.json`, dataset Workload dan workbook evaluasi v1. Tidak ada inference baru, label referensi tidak dikirim ke model, dan hasil lama tidak ditulis ulang. Prompt tetap activity-v1/summary-v1.

## ACT-0002 — Validasi invoice terhadap PO

Input asli: “Staff mencocokkan nomor purchase order, harga satuan, pajak, dan kuantitas pada invoice dengan data PO di ERP. Invoice yang cocok diteruskan untuk diproses, sedangkan selisih harga atau kuantitas harus diklarifikasi ke unit pembelian.”

Output tersimpan: High, majority_steps, rule_based_validation. Faktor: repetitiveness high, rule clarity high, data structure high, human judgment low, operational risk medium; effort medium, oversight true. Alasan: “Pencocokan nomor PO, harga, pajak, dan kuantitas mengikuti aturan eksplisit dan data terstruktur; hanya selisih yang memerlukan klarifikasi manusia.” Rekomendasi: “Otomasikan pencocokan tiga arah dan tandai selisih untuk klarifikasi ke unit pembelian; keputusan koreksi tetap pada pihak berwenang.” Oversight: “Selisih harga atau kuantitas diklarifikasi ke unit pembelian dan diputuskan oleh pihak berwenang sebelum diproses.”

Referensi Medium: pencocokan dapat diotomasi, tetapi discrepancy perlu penyelidikan dan tidak boleh otomatis diloloskan. Perbedaan level berasal dari ambiguitas proporsi exception pada input dan batas majority_steps pada rubrik: tidak ada volume/waktu kasus exception sehingga High versus Medium belum dapat diputuskan secara empiris. Kontrol manusia model sesuai arah referensi, tetapi ini tidak membuktikan mayoritas waktu dapat dihemat.

Rekomendasi “tiga arah” adalah asumsi model yang tidak didukung input: hanya invoice dan PO disebutkan; goods receipt tidak dipastikan tersedia. Sebelum implementasi, gunakan pencocokan dua dokumen; three-way matching hanya setelah ketersediaan dokumen penerimaan dikonfirmasi. Ini cacat rekomendasi, bukan alasan mengubah output historis. Perbaikan prompt berikutnya yang disarankan: wajib menyebut prasyarat dan tidak mengasumsikan dokumen/integrasi. Tidak diaktifkan pada sesi ini agar provenance dan biaya tetap terkendali.

## ACT-0007 — Rekonsiliasi pembayaran bank

Input asli: “Staff membandingkan mutasi rekening bank dengan daftar penerimaan pelanggan pada ERP, mencocokkan nominal dan referensi transaksi, kemudian menandai item yang belum teridentifikasi. Pembayaran parsial atau transaksi tanpa referensi diperiksa secara manual.”

Output tersimpan: High, majority_steps, data_reconciliation. Faktor: repetitiveness/rule clarity/data structure high, human judgment medium, operational risk high; effort medium, oversight true. Alasan: “Pencocokan mutasi bank dengan daftar penerimaan berdasarkan nominal dan referensi bersifat berulang dan berbasis aturan jelas, sementara item tak teridentifikasi memerlukan penelusuran manusia.” Rekomendasi: “Otomatiskan pencocokan nominal dan referensi serta penandaan selisih; pertahankan review manusia untuk item yang tidak cocok dan keputusan penyelesaiannya.” Oversight: “Staff keuangan meninjau dan menyetujui penyelesaian item yang belum teridentifikasi, pembayaran parsial, atau transaksi tanpa referensi sebelum tindak lanjut.”

Referensi Medium menekankan transaksi ambigu dan referensi bank tidak selalu lengkap. Model menekankan straight-through matching dan mempertahankan exception manual. Sumber perbedaan: input tidak mengukur proporsi pembayaran parsial/tanpa referensi; rubrik dan referensi memiliki bobot exception berbeda. Risiko high sendiri tidak melarang High pada validator, tetapi wajib oversight (dipenuhi). Review domain perlu mengukur waktu exception sebelum menetapkan saving implementasi; jangan mengganti level agar sama dengan referensi.

## ACT-0009 dan ACT-0039 — Grouping

ACT-0009, Pembuatan aging report: “Staff mengekspor saldo piutang pelanggan dari ERP, mengelompokkan invoice ke bucket umur piutang, lalu menyusun laporan mingguan dengan subtotal per pelanggan. Nilai yang tidak cocok dengan saldo AR ditandai untuk diperiksa sebelum laporan didistribusikan.”

Output tersimpan: High, majority_steps, periodic_reporting. Alasan: “Ekstraksi saldo, pengelompokan bucket umur piutang, dan penyusunan laporan mingguan bersifat berulang dan terstruktur; nilai yang tidak cocok ditandai untuk diperiksa sebelum distribusi.” Rekomendasi: “Otomatiskan ekstraksi ERP, pengelompokan aging, dan penyusunan laporan; pertahankan penandaan selisih saldo AR untuk ditinjau sebelum laporan dikirim.”

ACT-0039, Review konsolidasi headcount: “CHRO meninjau laporan gabungan jumlah karyawan dari empat unit, memverifikasi perubahan signifikan, dan mengarahkan koreksi jika ditemukan selisih dengan rencana tenaga kerja. Laporan ringkasan disiapkan HRIS/HR untuk bahan pembahasan pimpinan.”

Output tersimpan: Medium, partial_steps, data_reconciliation, oversight true. Alasan: “Konsolidasi headcount dari empat unit dapat dicocokkan otomatis dengan rencana tenaga kerja, tetapi verifikasi perubahan signifikan dan arahan koreksi memerlukan penilaian.” Rekomendasi: “Otomasikan penggabungan data unit dan penandaan selisih terhadap rencana tenaga kerja; CHRO meninjau exception dan menyetujui koreksi sebelum laporan final.”

GroupingPairs mengharapkan same dengan alasan keduanya laporan periodik. Model memilih berbeda: mekanisme dominan ACT-0009 adalah penyusunan laporan, sedangkan ACT-0039 pemeriksaan selisih terhadap rencana dan arahan koreksi. Berdasarkan input dan taksonomi mekanisme dominan, perbedaan model dapat dipertanggungjawabkan; label pasangan referensi terlalu berorientasi artefak laporan. Rekomendasi: domain reviewer meninjau label same ini pada versi evaluasi berikutnya, atau pisahkan aktivitas penyusunan dan review jika data operasional mendukung. Jangan ubah label diam-diam dan jangan ubah grup run lama. Catatan lain: rekomendasi ACT-0039 memperluas bantuan ke penggabungan data yang inputnya menyatakan disiapkan HRIS/HR; pastikan batas peran CHRO ketika merancang otomasi.

## Interpretasi evaluasi

13/15 level, 15/15 kategori aktivitas berlabel, dan 15/16 relasi pasangan adalah kesesuaian terhadap sampel evaluasi v1, bukan akurasi umum DeepSeek. Dua disagreement level memerlukan data exception/domain review; satu disagreement pasangan menunjukkan ambigu label referensi. Validasi JSON tidak mendeteksi seluruh asumsi semantik. Saving adalah skenario deterministik dan tidak boleh dianggap efisiensi yang sudah terealisasi.
