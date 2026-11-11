import { Link } from "react-router-dom";
import MetricCard from "../components/MetricCard";
import Icon from "../components/Icon";
import { formatFte } from "../lib/format";
import type { Summary } from "../types/workload";

export default function OverviewPage({
    summary,
    hasImports,
}: {
    summary: Summary | null;
    hasImports: boolean;
}) {
    if (!summary)
        return (
            <div className="panel empty">
                <span className="empty-icon">
                    <Icon name="upload" />
                </span>
                <h2>
                    {hasImports
                        ? "Pilih dataset untuk memulai"
                        : "Awali dengan data workload Anda"}
                </h2>
                <p>
                    Unggah workbook Workload untuk menghitung FTE per aktivitas
                    dan departemen.
                </p>
                <Link className="button primary" to="/imports">
                    Import workbook Excel →
                </Link>
            </div>
        );
    const max = Math.max(...summary.departments.map((d) => d.total_fte), 0.001);
    return (
        <>
            {summary.warnings.map((w) => (
                <div className="alert warning" key={w}>
                    {w}
                </div>
            ))}
            <div className="metrics">
                <MetricCard
                    label="Total FTE tercatat"
                    value={formatFte(summary.total_fte)}
                    detail="Dihitung dari seluruh aktivitas"
                    accent
                    icon="clock"
                    unit="FTE"
                />
                <MetricCard
                    label="Aktivitas"
                    value={String(summary.activities_count)}
                    detail="Baris workload tervalidasi"
                    icon="activities"
                />
                <MetricCard
                    label="Karyawan"
                    value={String(summary.employees_count)}
                    detail={`${summary.departments_count} departemen dalam dataset`}
                    icon="users"
                />
                <MetricCard
                    label="Potensi saving FTE"
                    value="—"
                    detail="Menunggu analisis AI"
                    icon="chart"
                />
            </div>
            <div className="dashboard-grid">
                <section className="panel">
                    <div className="panel-heading">
                        <div>
                            <span className="eyebrow">
                                BEBAN KERJA TERCATAT
                            </span>
                            <h2>FTE per departemen</h2>
                        </div>
                        <span className="subtle-tag">Tahunan</span>
                    </div>
                    <div className="department-chart">
                        {summary.departments.map((d, i) => (
                            <div className="department-row" key={d.department}>
                                <div className="department-label">
                                    <strong>{d.department}</strong>
                                    <span>{formatFte(d.total_fte)} FTE</span>
                                </div>
                                <div className="bar-track">
                                    <div
                                        className={`bar bar-${i % 3}`}
                                        style={{
                                            width: `${(d.total_fte / max) * 100}%`,
                                        }}
                                    />
                                </div>
                                <small>
                                    {d.activities_count} aktivitas ·{" "}
                                    {d.employees_count} karyawan
                                </small>
                            </div>
                        ))}
                    </div>
                    <p className="chart-note">
                        Mencerminkan aktivitas yang dicatat, bukan seluruh
                        kapasitas atau produktivitas individu.
                    </p>
                </section>
                <section className="panel methodology">
                    <span className="eyebrow">METODOLOGI</span>
                    <h2>Dasar perhitungan FTE</h2>
                    <p>
                        Volume, durasi, dan frekuensi diubah menjadi proporsi
                        waktu kerja tahunan.
                    </p>
                    <div className="formula">
                        volume × menit × faktor tahunan
                        <hr />
                        115.200 menit / FTE
                    </div>
                    <dl>
                        <div>
                            <dt>Daily</dt>
                            <dd>240 kali / tahun</dd>
                        </div>
                        <div>
                            <dt>Weekly</dt>
                            <dd>48 kali / tahun</dd>
                        </div>
                        <div>
                            <dt>Monthly</dt>
                            <dd>12 kali / tahun</dd>
                        </div>
                    </dl>
                    <Link to="/activities">Telusuri data aktivitas →</Link>
                </section>
            </div>
            <section className="ai-notice">
                <span className="notice-icon">
                    <Icon name="info" />
                </span>
                <div>
                    <strong>Penilaian otomatisasi belum tersedia</strong>
                    <p>
                        Potensi penghematan akan ditampilkan setelah penilaian
                        aktivitas tersedia. Angka FTE di atas berasal dari data
                        workload yang tercatat.
                    </p>
                </div>
                <span className="subtle-tag">Belum dianalisis</span>
            </section>
        </>
    );
}
