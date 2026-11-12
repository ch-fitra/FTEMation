import { Link } from "react-router-dom";
import { useState } from "react";
import Select from "../components/Select";
import MetricCard from "../components/MetricCard";
import OpportunityCards from "../components/OpportunityCards";
import { formatFte } from "../lib/format";
import type { Summary } from "../types/workload";

export default function OverviewPage({ summary, hasImports, importId }: {
    summary: Summary | null;
    hasImports: boolean;
    importId: number | null;
}) {
    const [period, setPeriod] = useState("year");
    if (!summary) return <section className="panel empty">
        <h2>{hasImports ? "Pilih dataset untuk memulai" : "Mulai analisis workload pertama Anda"}</h2>
        <p>Impor file Excel aktivitas kerja untuk menghitung FTE dan menemukan peluang otomatisasi menggunakan AI.</p>
        <ol className="journey"><li>Impor dataset</li><li>Periksa aktivitas dan beban kerja</li><li>Jalankan analisis AI</li><li>Tinjau rekomendasi dan unduh laporan</li></ol>
        <div><Link className="button primary" to="/imports">Impor Dataset</Link></div>
    </section>;
    const max = Math.max(...summary.departments.map(d => d.total_fte), 0.001);
    const periods: Record<string, { divisor: number; unit: string }> = {
        year: { divisor: 1, unit: "tahun" },
        month: { divisor: summary.calculation.annual_factors.monthly, unit: "bulan" },
        week: { divisor: summary.calculation.annual_factors.weekly, unit: "minggu kerja" },
        day: { divisor: summary.calculation.annual_factors.daily, unit: "hari kerja" },
    };
    const selected = periods[period];
    const hours = (fte: number) => (fte * summary.calculation.annual_capacity_minutes / 60 / selected.divisor).toLocaleString("id-ID", { maximumFractionDigits: 2 });
    return <>
        {!summary.analysis_run_id && <p className="alert">{summary.analysis_status === "cancel_requested" ? "Permintaan pembatalan diterima. Menunggu proses berhenti dengan aman." : summary.analysis_status === "cancelled" ? "Analisis dibatalkan. Hasil aktivitas yang selesai tetap tersimpan; lanjutkan dari halaman Analisis AI." : summary.analysis_status === "queued" ? "Analisis masih dalam antrean dan belum mulai diproses. Periksa status di halaman Analisis AI." : summary.analysis_status === "processing" ? "Analisis sedang diproses di server. Hasil lengkap tersedia setelah proses selesai." : summary.analysis_status.includes("failed") ? "Analisis belum berhasil. Tinjau kendala di halaman Analisis AI." : <>Dataset berhasil diimpor. <Link to="/activities">Periksa data aktivitas</Link> atau lanjutkan ke analisis AI.</>}</p>}
        <div className="metrics">
            <MetricCard label="Total workload" value={formatFte(summary.total_fte)} detail="FTE aktivitas tercatat" icon="clock" unit="FTE" />
            <MetricCard label="Estimasi saving" value={summary.estimated_fte_saving === null ? "—" : formatFte(summary.estimated_fte_saving)} detail={summary.analysis_run_id ? `Snapshot run ${summary.analysis_run_id}` : "Menunggu analisis lengkap"} icon="chart" accent />
            <MetricCard label="Sisa workload" value={summary.remaining_fte === null ? "—" : formatFte(summary.remaining_fte)} detail="Setelah estimasi penghematan" icon="activities" />
            <MetricCard label="Kontrol manusia wajib" value={summary.oversight_count == null ? "—" : String(summary.oversight_count)} detail="Tinjau catatan pengawasan AI" icon="users" />
        </div>
        {!!summary.top_opportunities?.length && <section className="panel spotlight">
            <h2>Peluang otomatisasi terbaik</h2>
            <OpportunityCards activities={summary.top_opportunities} importId={importId} runId={summary.analysis_run_id ?? null} spotlight />
            <small>Estimasi kapasitas waktu, bukan pengurangan jumlah karyawan. Validasi rekomendasi bersama pemilik proses.</small>
        </section>}
        {summary.warnings.map(w => <div className="alert warning" key={w}>{w}</div>)}
        <div className="department-overview">
            <section className="panel"><div className="panel-heading"><h2>FTE per departemen</h2><label className="period-control"><span>Periode jam kerja</span><Select aria-label="Periode jam kerja" value={period} onChange={e => setPeriod(e.target.value)}><option value="year">Tahunan</option><option value="month">Average Bulanan</option><option value="week">Average Mingguan</option><option value="day">Average Harian</option></Select></label></div>
                <div className="department-chart">{summary.departments.map(d => <div className="department-row" key={d.department}>
                    <div className="department-label"><strong>{d.department}</strong><span>{formatFte(d.total_fte)} FTE</span></div>
                    <div className="bar-track"><div className="bar bar-0" style={{width:`${d.total_fte / max * 100}%`}} /></div>
                    <p className="department-hours">{period !== "year" ? "Average " : ""}{hours(d.total_fte)} jam / {selected.unit}</p>
                    <small>{d.activities_count} aktivitas · {d.employees_count} karyawan{d.estimated_fte_saving != null ? ` · Saving ${formatFte(d.estimated_fte_saving)} FTE (${hours(d.estimated_fte_saving)} jam / ${selected.unit})` : ''}</small>
                </div>)}</div>
                <p className="chart-note">Batang menunjukkan FTE; nilainya tetap saat periode berubah karena workload dan kapasitas dikonversi dengan faktor yang sama. Kapasitas satu FTE: {hours(1)} jam / {selected.unit}. {period !== "year" && "Jam merupakan rata-rata dari asumsi tahunan, bukan catatan kalender aktual. "}Saving memakai snapshot yang sama. <Link to={`/help${importId ? `?dataset=${importId}` : ""}#fte`}>Pelajari perhitungan di Q&A</Link>.</p>
            </section>
        </div>
    </>;
}
