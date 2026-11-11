import { Link } from "react-router-dom";
import MetricCard from "../components/MetricCard";
import OpportunityCards from "../components/OpportunityCards";
import { formatFte } from "../lib/format";
import type { Summary } from "../types/workload";

export default function OverviewPage({ summary, hasImports, importId }: {
    summary: Summary | null;
    hasImports: boolean;
    importId: number | null;
}) {
    if (!summary) return <section className="panel empty">
        <h2>{hasImports ? "Pilih dataset untuk memulai" : "Mulai analisis workload pertama Anda"}</h2>
        <p>Impor file Excel aktivitas kerja untuk menghitung FTE dan menemukan peluang otomatisasi menggunakan AI.</p>
        <ol className="journey"><li>Impor dataset</li><li>Periksa aktivitas dan beban kerja</li><li>Jalankan analisis AI</li><li>Tinjau rekomendasi dan unduh laporan</li></ol>
        <div><Link className="button primary" to="/imports">Impor Dataset</Link></div>
    </section>;
    const analysisLink = `/analysis?dataset=${importId}${summary.analysis_run_id ? `&run=${summary.analysis_run_id}` : ''}`;
    const max = Math.max(...summary.departments.map(d => d.total_fte), 0.001);
    return <>
        <section className="decision-heading">
            <div><span className="eyebrow">AI DECISION WORKSPACE</span><h2>FTEMation Decision Dashboard</h2><p>Pahami beban kerja, tinjau peluang, tentukan langkah berikutnya.</p></div>
            <Link className="button primary" to={analysisLink}>{summary.analysis_run_id ? "Lihat Hasil Analisis" : ["queued", "processing"].includes(summary.analysis_status) ? "Lihat Progres Analisis" : "Lanjut ke Analisis AI"}</Link>
        </section>
        {!summary.analysis_run_id && <p className="alert">{["queued", "processing"].includes(summary.analysis_status) ? "Analisis sedang berjalan di server. Hasil lengkap tersedia setelah proses selesai." : summary.analysis_status.includes("failed") ? "Analisis belum berhasil. Tinjau kendala di halaman Analisis AI." : <>Dataset berhasil diimpor. <Link to="/activities">Periksa data aktivitas</Link> atau lanjutkan ke analisis AI.</>}</p>}
        <div className="metrics">
            <MetricCard label="Total workload" value={formatFte(summary.total_fte)} detail="FTE aktivitas tercatat" icon="clock" unit="FTE" />
            <MetricCard label="Estimasi saving" value={summary.estimated_fte_saving === null ? "—" : formatFte(summary.estimated_fte_saving)} detail={summary.analysis_run_id ? `Snapshot run #${summary.analysis_run_id}` : "Menunggu analisis lengkap"} icon="chart" accent />
            <MetricCard label="Sisa workload" value={summary.remaining_fte === null ? "—" : formatFte(summary.remaining_fte)} detail="Setelah estimasi penghematan" icon="activities" />
            <MetricCard label="Kontrol manusia wajib" value={summary.oversight_count == null ? "—" : String(summary.oversight_count)} detail="Tinjau catatan pengawasan AI" icon="users" />
        </div>
        {!!summary.top_opportunities?.length && <section className="panel spotlight">
            <span className="eyebrow">TOP AUTOMATION OPPORTUNITY</span><h2>Peluang otomatisasi terbaik</h2>
            <OpportunityCards activities={summary.top_opportunities} importId={importId} runId={summary.analysis_run_id ?? null} spotlight />
            <small>Estimasi kapasitas waktu, bukan pengurangan jumlah karyawan. Validasi rekomendasi bersama pemilik proses.</small>
        </section>}
        {summary.warnings.map(w => <div className="alert warning" key={w}>{w}</div>)}
        <div className="dashboard-grid">
            <section className="panel"><div className="panel-heading"><h2>FTE per departemen</h2><span className="subtle-tag">Tahunan</span></div>
                <div className="department-chart">{summary.departments.map(d => <div className="department-row" key={d.department}>
                    <div className="department-label"><strong>{d.department}</strong><span>{formatFte(d.total_fte)} FTE</span></div>
                    <div className="bar-track"><div className="bar bar-0" style={{width:`${d.total_fte / max * 100}%`}} /></div>
                    <small>{d.activities_count} aktivitas · {d.employees_count} karyawan{d.estimated_fte_saving != null ? ` · Saving ${formatFte(d.estimated_fte_saving)} FTE` : ''}</small>
                </div>)}</div>
                <p className="chart-note">Panjang batang menunjukkan baseline workload tercatat. Saving adalah estimasi kapasitas waktu dari snapshot run yang sama.</p>
            </section>
            <details className="panel methodology"><summary>Bagaimana FTE dihitung?</summary>
                <p>Volume, durasi, dan frekuensi diubah menjadi proporsi waktu kerja tahunan.</p>
                <div className="formula">volume × menit × faktor tahunan<hr />{summary.calculation.annual_capacity_minutes.toLocaleString('id-ID')} menit / FTE</div>
                <dl>{Object.entries(summary.calculation.annual_factors).map(([frequency, value]) => <div key={frequency}><dt>{frequency}</dt><dd>{value} kali / tahun</dd></div>)}</dl>
                <p>Asumsi berasal dari snapshot completed run, atau konfigurasi aktif sebelum analisis. Aktivitas tercatat merupakan cuplikan pekerjaan, bukan ukuran produktivitas individu.</p>
                <Link to="/activities">Telusuri data aktivitas →</Link>
            </details>
        </div>
    </>;
}
