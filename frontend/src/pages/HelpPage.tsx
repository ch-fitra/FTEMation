import type { Summary } from "../types/workload";

import HelpAccordion from "../components/HelpAccordion";

export default function HelpPage({ summary }: { summary: Summary | null }) {
    const calculation = summary?.calculation;
    return <section className="help-page" aria-label="Pertanyaan dan jawaban penggunaan FTEMation">
        <HelpAccordion number={1} id="fte" question="Bagaimana FTE dihitung?">
            <p>FTE adalah proporsi waktu aktivitas terhadap kapasitas kerja satu orang. FTE tahunan = volume × durasi menit × faktor tahunan ÷ kapasitas menit per tahun.</p>
            {calculation ? <>
                <div className="formula">volume × durasi menit × faktor tahunan<hr />{calculation.annual_capacity_minutes.toLocaleString("id-ID")} menit / FTE / tahun</div>
                <dl>{Object.entries(calculation.annual_factors).map(([frequency, value]) => <div key={frequency}><dt>{frequency}</dt><dd>{value} kali / tahun</dd></div>)}</dl>
                <p>Angka di atas mengikuti {summary.analysis_run_id ? `snapshot completed run #${summary.analysis_run_id}` : "konfigurasi aktif untuk dataset sebelum analisis"}. Laporan run lain mengikuti snapshot masing-masing.</p>
            </> : <p>Pilih atau impor dataset untuk melihat asumsi perhitungan yang digunakan. Rumus juga tersedia di README proyek.</p>}
            <p>Aktivitas tercatat merupakan cuplikan pekerjaan, bukan ukuran produktivitas individu. Nilai di atas satu FTE perlu diverifikasi dari volume, periode, durasi dan pembagian pekerjaan; nilainya tidak dibatasi otomatis.</p>
        </HelpAccordion>
        <HelpAccordion number={2} question="Apa arti pilihan periode tahunan, bulanan, mingguan dan harian?">
            <p>Grafik tetap menampilkan rasio FTE. Jam kerja dan estimasi jam saving dikonversi ke periode pilihan dengan faktor tahunan dari snapshot. Rasio FTE tetap karena workload dan kapasitas dibagi dengan faktor yang sama.</p>
            <p>Dengan asumsi 1.920 jam per tahun, 12 bulan, 48 minggu kerja dan 240 hari kerja, satu FTE setara 160 jam/bulan, 40 jam/minggu kerja atau 8 jam/hari kerja. Angka periode pendek adalah rata-rata, bukan tren kalender atau jam aktual pada tanggal tertentu.</p>
        </HelpAccordion>
        <HelpAccordion number={3} id="reading-results" question="Bagaimana cara membaca hasil analisis?">
            <p>Mulai dari prioritas tertinggi, lalu baca alasan, rekomendasi, risiko, effort dan kontrol manusia. High berarti mayoritas langkah dapat diotomasi, Medium sebagian langkah, dan Low bantuan terbatas dengan judgment manusia tetap dominan.</p>
            <p>Skor prioritas mempertimbangkan saving, risiko, dan kesulitan implementasi. Skor tersebut bukan probabilitas keberhasilan. Konfirmasi prasyarat data dan integrasi dengan pemilik proses sebelum implementasi.</p>
        </HelpAccordion>
        <HelpAccordion number={4} question="Bagaimana estimasi saving dan sisa workload dihitung?">
            <p>Saving = FTE × asumsi saving untuk level otomasi. Sisa workload = total FTE − estimasi saving. Agregasi dilakukan sebelum pembulatan.</p>
            {calculation && <ul>{Object.entries(calculation.saving_rates).map(([level, rate]) => <li key={level}>{level}: {(rate * 100).toLocaleString("id-ID")}%</li>)}</ul>}
            <p>Saving adalah estimasi kapasitas waktu, belum menjadi efisiensi yang terealisasi dan bukan keputusan pengurangan karyawan.</p>
        </HelpAccordion>
        <HelpAccordion number={5} question="Apa arti kontrol manusia dan human oversight?">
            <p>Persetujuan rutin berarti manusia menyetujui setiap transaksi. Review pengecualian menangani kasus di luar kriteria. Keputusan final berisiko tetap menjadi kewenangan manusia berwenang.</p>
            <p>Label false bukan jaminan proses tanpa manusia. Baca rekomendasi dan catatan kontrol untuk memastikan peran dan pemicu review. Risiko atau judgment tinggi tetap memerlukan pengawasan manusia.</p>
        </HelpAccordion>
        <HelpAccordion number={6} question="Mengapa aktivitas dalam satu grup bisa memiliki level berbeda?">
            <p>Grouping mengikuti mekanisme dominan, bukan hanya departemen atau kesamaan kata. Exception, judgment dan risiko dapat berbeda dalam grup yang sama. Kandidat review konsistensi membantu membandingkan alasan; perbedaan level sendiri bukan bukti kesalahan.</p>
        </HelpAccordion>
        <HelpAccordion number={7} question="Bagaimana memulai analisis dan menangani kegagalan?">
            <p>Impor workbook .xlsx dengan satu sheet Workload dan sembilan kolom wajib. Tinjau Data aktivitas, lalu jalankan Analisis AI. Analisis baru mengirim data ke provider dan dapat menggunakan saldo API.</p>
            <p>Jika gagal, baca detail kendala lalu gunakan retry setelah penyebab diperbaiki. Hasil sukses dipertahankan dan cache digunakan untuk data yang tidak berubah. Proses memerlukan worker backend yang aktif.</p>
        </HelpAccordion>
        <HelpAccordion number={8} question="Hasil mana yang ditampilkan dan kapan laporan dapat diunduh?">
            <p>Overview memakai completed run terbaru untuk dataset aktif; proses run baru dapat dipantau pada Analisis AI. Di Hasil analisis, pilih run untuk membaca rekomendasi dan mengunduh JSON, Excel atau PDF.</p>
            <p>Export final tersedia setelah seluruh aktivitas dan kesimpulan selesai. Gunakan workbook dan results.json dari dataset serta run yang sama. Versi prompt pada hasil historis tetap mengikuti run tersebut.</p>
        </HelpAccordion>
    </section>;
}
