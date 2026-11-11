# Metodologi ringkas FTEMation

Data sintetis: 60 aktivitas, 12 karyawan, 3 departemen. Lima aktivitas per karyawan hanya cuplikan pekerjaan. FTE bukan ukuran seluruh produktivitas orang.

`FTE = volume × duration_minutes × annual_factor / annual_capacity_minutes`.
Baseline daily=240, weekly=48, monthly=12; kapasitas=115200 menit/tahun.
ACT-0001=10×9×240/115200=0.1875; total dataset=4.4671875 FTE.

DeepSeek Flash menilai repetitiveness, rule clarity, data structure, human judgment, operational risk. High=mayoritas langkah terstruktur dapat diotomasi; Medium=sebagian langkah dengan exception/review signifikan; Low=AI mendukung pekerjaan yang didominasi judgment/keputusan manusia. Scope majority_steps/partial_steps/assist_only mengikuti level. Effort low/medium/high memperkirakan kesulitan implementasi. Risiko/judgment high wajib human oversight; keputusan konsekuensial tetap manusia.

Setiap aktivitas memilih tepat satu dari 20 kategori mekanisme dominan, lintas departemen. Entry, validasi, rekonsiliasi, reporting dan investigasi dibedakan. Kesamaan grup tidak mewajibkan level/risiko sama.

Laravel menghitung `saving = FTE × saving_rate`, baseline High=.6, Medium=.3, Low=.1. Prioritas=`100 × saving/maxSavingRun × riskFactor × effortFactor`, nol jika maxSavingRun nol. Risk low/medium/high=1/.7/.4; effort=1/.75/.5. Urutan seri menggunakan activity_id. Ini skenario kapasitas waktu, bukan realisasi efisiensi atau rekomendasi PHK.

Setiap run menyimpan snapshot perhitungan, prompt, model, fingerprint dan taksonomi. Dashboard memakai completed run terbaru untuk seluruh angka dan metode; status menunjukkan run terbaru meskipun masih berjalan/gagal. Tanpa hasil lengkap, baseline memakai konfigurasi aktif dan saving belum tersedia. Report terpilih dan tiga export memakai snapshot run yang sama. Angka internal dihitung sebelum pembulatan; export membulatkan enam desimal.

Provider memakai JSON mode, thinking disabled, temperature nol; Laravel memvalidasi shape, ID unik, enum, taksonomi dan oversight. Maksimal tiga percobaan HTTP/batch, cache privat untuk konten/model/prompt/taksonomi identik. Queue memakai lock run, retry contention terbatas dan fatal exception terpisah. Hasil sukses tidak diulang saat retry bagian gagal. Final export membutuhkan semua aktivitas serta seluruh kesimpulan sukses.

Run #1 nyata: 21 High, 24 Medium, 15 Low; saving internal 1.6724791666666663 FTE. Hasil disimpan tanpa inference baru selama persiapan ini. Kesesuaian 13/15 label sampel bukan akurasi umum. Rekomendasi bisa mengasumsikan dokumen/integrasi yang belum tersedia; lihat AI_VERIFICATION. Review domain diperlukan sebelum produksi. Detail rubrik dan konfigurasi model/key/backend tersedia di README dan prompt versioned; referensi evaluasi tidak diberikan ke model.
