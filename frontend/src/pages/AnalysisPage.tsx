import Select from "../components/Select";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ErrorAlert from "../components/ErrorAlert";
import MetricCard from "../components/MetricCard";
import { api, errorMessages } from "../lib/http";
import { formatFte } from "../lib/format";
import type { AnalysisRun } from "../types/analysis";
import "../styles/pages/analysis.css";

const statusLabel: Record<string, string> = {
    queued: "Dalam antrean",
    processing: "Sedang dianalisis",
    completed: "Selesai",
    partial_failed: "Sebagian gagal",
    failed: "Gagal",
};
const factorLabel: Record<string, string> = {
    repetitiveness: "Pengulangan",
    rule_clarity: "Kejelasan aturan",
    data_structure: "Struktur data",
    human_judgment: "Pertimbangan manusia",
    operational_risk: "Risiko operasional",
};

export default function AnalysisPage({
    importId,
    onComplete,
}: {
    importId: number | null;
    onComplete: () => void;
}) {
    const [history, setHistory] = useState<{ id: number; status: string }[]>(
        [],
    );
    const [runId, setRunId] = useState<number | null>(null);
    const [run, setRun] = useState<AnalysisRun | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [download, setDownload] = useState("");
    const [version, setVersion] = useState(0);
    const [tab, setTab] = useState("priorities");
    const [search, setSearch] = useState("");
    const [level, setLevel] = useState("");
    useEffect(() => {
        if (!importId) return;
        const controller = new AbortController();
        api.get(`/api/imports/${importId}/analyses`, {
            signal: controller.signal,
        })
            .then(({ data }) => {
                setHistory(data);
                setRunId((id) =>
                    data.some((r: { id: number }) => r.id === id)
                        ? id
                        : (data[0]?.id ?? null),
                );
            })
            .catch((e) => {
                if (!controller.signal.aborted) setErrors(errorMessages(e));
            });
        return () => controller.abort();
    }, [importId, version]);
    useEffect(() => {
        if (!runId) return;
        const controller = new AbortController();
        let timer: number;
        const poll = async () => {
            try {
                const { data } = await api.get<AnalysisRun>(
                    `/api/analyses/${runId}`,
                    { signal: controller.signal },
                );
                if (controller.signal.aborted) return;
                setRun(data);
                setHistory((items) =>
                    items.map((item) =>
                        item.id === data.id
                            ? { ...item, status: data.status }
                            : item,
                    ),
                );
                if (["queued", "processing"].includes(data.status))
                    timer = window.setTimeout(poll, 2000);
                else if (data.status === "completed") onComplete();
            } catch (e) {
                if (!controller.signal.aborted) setErrors(errorMessages(e));
            }
        };
        void poll();
        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
        // Completion refreshes the shared dashboard; do not restart polling when callback changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runId, version]);
    async function start(retry = false) {
        setBusy(true);
        setErrors([]);
        try {
            const { data } = await api.post(
                retry
                    ? `/api/analyses/${runId}/retry`
                    : `/api/imports/${importId}/analyses`,
            );
            setRun(null);
            setRunId(data.run.id);
            setVersion((v) => v + 1);
        } catch (e) {
            setErrors(errorMessages(e));
        } finally {
            setBusy(false);
        }
    }
    async function exportFile(format: string) {
        setDownload(format);
        setErrors([]);
        try {
            const { data } = await api.get(
                `/api/analyses/${runId}/export/${format}`,
                { responseType: "blob" },
            );
            const url = URL.createObjectURL(data);
            const a = document.createElement("a");
            a.href = url;
            a.download =
                format === "json"
                    ? "results.json"
                    : `FTEMation-analysis-${runId}.${format}`;
            a.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setErrors([
                "Export gagal. Pastikan analisis lengkap dan sesi masih aktif, lalu coba lagi.",
            ]);
        } finally {
            setDownload("");
        }
    }
    if (!importId)
        return (
            <section className="panel empty">
                <h2>Mulai dengan dataset workload</h2>
                <Link to="/imports">Import dataset</Link>
            </section>
        );
    const active = run && ["queued", "processing"].includes(run.status);
    const report = run?.report;
    const ranked = report
        ? report.priorities.map((id) =>
              report.activities.find((a) => a.activity_id === id)!,
          )
        : [];
    const activities = (
        tab === "priorities" ? ranked : (report?.activities ?? [])
    ).filter(
        (a) =>
            (!level || a.automation_level === level) &&
            `${a.activity_id} ${a.activity_name} ${a.employee_name} ${a.department}`
                .toLowerCase()
                .includes(search.toLowerCase()),
    );
    return (
        <div className="analysis-page">
            <section className="panel analysis-toolbar">
                <div>
                    <span className="eyebrow">AUTOMATION INTELLIGENCE</span>
                    <h2>Peluang yang dapat ditindaklanjuti</h2>
                    <p>
                        Temukan aktivitas yang berpotensi diotomatisasi, tinjau rekomendasinya, lalu tentukan langkah berikutnya.
                    </p>
                </div>
                <button
                    className="primary"
                    disabled={busy || !!active}
                    onClick={() => void start()}
                >
                    {busy
                        ? "Memproses…"
                        : active
                          ? "Analisis berjalan"
                          : "Mulai analisis"}
                </button>
            </section>
            <ol className="analysis-steps" aria-label="Alur analisis">
                <li><span>1</span><div><strong>Analisis dataset</strong><small>AI menilai peluang setiap aktivitas.</small></div></li>
                <li><span>2</span><div><strong>Tinjau prioritas</strong><small>Bandingkan saving, risiko, dan rekomendasi.</small></div></li>
                <li><span>3</span><div><strong>Rencanakan implementasi</strong><small>Validasi dengan pemilik proses, lalu unduh hasil.</small></div></li>
            </ol>
            <ErrorAlert messages={errors} />
            {history.length > 0 && (
                <label className="analysis-history">
                    Riwayat analisis
                    <Select
                        value={runId ?? ""}
                        onChange={(e) => {
                            setRun(null);
                            setRunId(Number(e.target.value));
                        }}
                    >
                        {history.map((r) => (
                            <option key={r.id} value={r.id}>
                                Analisis {r.id} ·{" "}
                                {statusLabel[r.status] ?? r.status}
                            </option>
                        ))}
                    </Select>
                </label>
            )}
            {!run && (
                <p role="status">
                    {runId
                        ? "Memuat hasil analisis…"
                        : "Belum ada analisis. Mulai untuk menilai seluruh aktivitas dalam dataset ini."}
                </p>
            )}
            {run && (
                <section className="panel analysis-status" aria-live="polite">
                    <div>
                        <strong>{statusLabel[run.status] ?? run.status}</strong>
                        <p>{run.progress.success ?? 0} dari {run.total} aktivitas berhasil dianalisis.</p>
                        <progress aria-label="Kemajuan analisis aktivitas" max={Math.max(1, run.total)} value={run.progress.success ?? 0} />
                        <p className="muted">{run.status === "completed" ? "Hasil siap ditinjau dan diunduh." : active ? "Hasil lengkap akan tersedia setelah seluruh aktivitas dan kesimpulan selesai." : "Tinjau kendala di bawah, lalu coba kembali aktivitas yang gagal."}</p>
                        <details className="analysis-technical"><summary>Detail proses analisis</summary>
                            <p>{run.actual_model ?? run.model_name} · {run.requests_count} request · {run.input_tokens + run.output_tokens} token · {run.cache_hits} dari cache · Status kesimpulan: {statusLabel[run.summary_status] ?? run.summary_status}</p>
                        </details>
                    </div>
                    {active && (
                        <span
                            className="analysis-spinner"
                            aria-label="Analisis berlangsung"
                        />
                    )}
                    {run.can_retry && (
                        <button
                            className="primary"
                            disabled={busy}
                            onClick={() => void start(true)}
                        >
                            Coba kembali yang gagal
                        </button>
                    )}
                    {run.error_message && (
                        <p className="analysis-error">{run.error_message}</p>
                    )}
                    {run.failures.length > 0 && (
                        <details>
                            <summary>
                                {run.failures.length} aktivitas perlu dicoba
                                kembali
                            </summary>
                            {run.failures.map((f) => (
                                <p key={f.activity_id}>
                                    {f.activity_id}: {f.message}
                                </p>
                            ))}
                        </details>
                    )}
                    {active && (
                        <small>
                            Proses berjalan di server. Anda boleh berpindah
                            halaman dan kembali untuk melihat perkembangannya.
                        </small>
                    )}
                </section>
            )}
            {report && (
                <>
                    <div className="metrics">
                        <MetricCard
                            label="Total workload"
                            value={formatFte(report.totals.total_fte)}
                            detail="FTE sebelum otomatisasi"
                            icon="clock"
                        />
                        <MetricCard
                            label="Estimasi saving"
                            value={formatFte(
                                report.totals.estimated_fte_saving,
                            )}
                            detail={`Asumsi ${Object.entries(report.calculation.saving_rates).map(([level, rate]) => `${level[0].toUpperCase()}${level.slice(1)} ${new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 2 }).format(rate)}`).join(' · ')}`}
                            icon="chart"
                            accent
                        />
                        <MetricCard
                            label="Sisa workload"
                            value={formatFte(report.totals.remaining_fte)}
                            detail="Setelah estimasi penghematan"
                            icon="activities"
                        />
                        <MetricCard
                            label="Kontrol manusia wajib"
                            value={String(report.totals.oversight_count)}
                            detail="Menurut label AI; lihat catatan kontrol"
                            icon="users"
                        />
                    </div>
                    <section className="panel analysis-results">
                        <div className="panel-heading">
                            <div>
                                <h2>Hasil analisis</h2>
                                <p>{report.interpretation}</p>
                            </div>
                            <div className="analysis-exports">
                                {["json", "xlsx", "pdf"].map((f) => (
                                    <button
                                        key={f}
                                        disabled={!!download}
                                        onClick={() => void exportFile(f)}
                                    >
                                        {download === f
                                            ? "Menyiapkan…"
                                            : f === "json"
                                              ? "results.json"
                                              : f.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="analysis-reading-guide">
                            <strong>Cara membaca hasil</strong>
                            <p>Mulai dari prioritas tertinggi. Saving adalah estimasi kapasitas waktu dalam FTE; skor prioritas mempertimbangkan saving, risiko, dan kesulitan implementasi.</p>
                            <span>High: mayoritas langkah · Medium: sebagian langkah · Low: bantuan terbatas. Keputusan dan pengawasan tetap pada manusia.</span>
                            <p>Persetujuan rutin berarti manusia menyetujui setiap transaksi. Review pengecualian berlaku untuk kasus di luar kriteria. Keputusan final berisiko tetap pada manusia berwenang. Label AI tidak merinci seluruh jenis kontrol; konfirmasi peran dan pemicu bersama pemilik proses.</p>
                        </div>
                        {!!run?.consistency_review?.length && (
                            <details className="analysis-reading-guide">
                                <summary>Review konsistensi: {run.consistency_review.length} kelompok dengan level berbeda</summary>
                                <p>Kandidat review, bukan bukti inkonsistensi. Kategori yang sama tidak menjamin proses identik; bandingkan langkah, exception, judgment, dan risiko bersama pemilik proses.</p>
                                {run.consistency_review.map((group) => (
                                    <details key={group.group_id}>
                                        <summary>{group.group_id}</summary>
                                        {group.activities.map((a) => <p key={a.activity_id}><b>{a.activity_id} · {a.department} · {a.automation_level}</b>: {a.reason}</p>)}
                                    </details>
                                ))}
                            </details>
                        )}
                        <div className="analysis-distribution">
                            {Object.entries(report.totals.levels).map(
                                ([l, n]) => (
                                    <span
                                        key={l}
                                        className={`level level-${l}`}
                                    >
                                        {l.toUpperCase()} <b>{n}</b>
                                    </span>
                                ),
                            )}
                        </div>
                        <div
                            className="analysis-tabs"
                            role="group"
                            aria-label="Tampilan hasil"
                        >
                            {[
                                ["priorities", "Prioritas"],
                                ["activities", "Seluruh aktivitas"],
                                ["groups", "Kelompok aktivitas"],
                                ["employees", "Karyawan"],
                                ["departments", "Departemen"],
                            ].map(([key, title]) => (
                                <button
                                    key={key}
                                    aria-pressed={tab === key}
                                    onClick={() => setTab(key)}
                                >
                                    {title}
                                </button>
                            ))}
                        </div>
                        {["priorities", "activities"].includes(tab) && (
                            <>
                                <div className="analysis-filters">
                                    <label>
                                        Cari hasil
                                        <input
                                            value={search}
                                            onChange={(e) =>
                                                setSearch(e.target.value)
                                            }
                                            placeholder="Aktivitas, karyawan, departemen"
                                        />
                                    </label>
                                    <label>
                                        Peluang otomatisasi
                                        <Select
                                            aria-label="Peluang otomatisasi"
                                            value={level}
                                            onChange={(e) =>
                                                setLevel(e.target.value)
                                            }
                                        >
                                            <option value="">
                                                Semua level
                                            </option>
                                            {["high", "medium", "low"].map(
                                                (l) => (
                                                    <option key={l}>{l}</option>
                                                ),
                                            )}
                                        </Select>
                                    </label>
                                </div>
                                <p className="analysis-result-count" role="status">{activities.length} aktivitas ditampilkan · {tab === "priorities" ? "Diurutkan berdasarkan skor prioritas tertinggi" : "Seluruh aktivitas dalam hasil analisis"}</p>
                                <div className="table-scroll">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Aktivitas / rekomendasi</th>
                                                <th>Level</th>
                                                <th>FTE</th>
                                                <th>Saving</th>
                                                <th>Prioritas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activities.map((a) => (
                                                <tr key={a.activity_id}>
                                                    <td className="analysis-activity">
                                                        <small>
                                                            {a.activity_id} ·{" "}
                                                            {a.department} ·{" "}
                                                            {a.employee_name}
                                                        </small>
                                                        <strong>
                                                            {a.activity_name}
                                                        </strong>
                                                        <p>
                                                            {a.recommendation}
                                                        </p>
                                                        <details>
                                                            <summary>
                                                                Alasan dan
                                                                faktor penilaian
                                                            </summary>
                                                            <p>{a.reason}</p>
                                                            <p>
                                                                Grouping:{" "}
                                                                {a.group_name}
                                                            </p>
                                                            <dl className="analysis-factors">
                                                                {Object.entries(
                                                                    a.factors,
                                                                ).map(
                                                                    ([
                                                                        k,
                                                                        v,
                                                                    ]) => (
                                                                        <div
                                                                            key={
                                                                                k
                                                                            }
                                                                        >
                                                                            <dt>
                                                                                {factorLabel[
                                                                                    k
                                                                                ] ??
                                                                                    k}
                                                                            </dt>
                                                                            <dd>
                                                                                {
                                                                                    v
                                                                                }
                                                                            </dd>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </dl>
                                                            <p>
                                                                Risiko:{" "}
                                                                {a.risk_level} ·
                                                                Effort:{" "}
                                                                {a.effort_level}
                                                            </p>
                                                            <p>
                                                                Kontrol manusia menurut label AI:{" "}
                                                                {a.oversight_required
                                                                    ? "Diwajibkan. Lihat catatan untuk persetujuan rutin, review pengecualian, atau keputusan final."
                                                                    : "Tidak diwajibkan oleh label; bukan jaminan tanpa manusia. Review pengecualian tetap mengikuti rekomendasi. Konfirmasi pemicu dan penanggung jawab dengan pemilik proses."}
                                                                {" "}
                                                                {
                                                                    a.oversight_note
                                                                }
                                                            </p>
                                                        </details>
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`level level-${a.automation_level}`}
                                                        >
                                                            {a.automation_level}
                                                        </span>
                                                    </td>
                                                    <td>{formatFte(a.fte)}</td>
                                                    <td>
                                                        {formatFte(
                                                            a.estimated_fte_saving,
                                                        )}
                                                    </td>
                                                    <td>
                                                        {a.priority_score.toFixed(
                                                            2,
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {activities.length === 0 && (
                                    <p>Tidak ada hasil yang sesuai filter.</p>
                                )}
                            </>
                        )}
                        {tab === "groups" && (
                            <div className="analysis-cards">
                                {report.groups.map((g) => (
                                    <article key={g.group_id}>
                                        <span className="eyebrow">
                                            {g.departments.length > 1
                                                ? "LINTAS DEPARTEMEN"
                                                : "SATU DEPARTEMEN"}
                                        </span>
                                        <h3>{g.name}</h3>
                                        <p>{g.departments.join(" · ")}</p>
                                        <p>
                                            <b>{g.activities_count}</b>{" "}
                                            aktivitas · {formatFte(g.total_fte)}{" "}
                                            FTE · saving{" "}
                                            {formatFte(g.estimated_fte_saving)}
                                        </p>
                                        <details>
                                            <summary>Anggota kelompok</summary>
                                            <p>{g.members.join(", ")}</p>
                                        </details>
                                    </article>
                                ))}
                            </div>
                        )}
                        {["employees", "departments"].includes(tab) && (
                            <div className="analysis-cards">
                                {(tab === "employees"
                                    ? report.employees
                                    : report.departments
                                ).map((e) => (
                                    <article
                                        key={e.employee_id ?? e.department}
                                    >
                                        <h3>
                                            {e.employee_name ?? e.department}
                                        </h3>
                                        <small>
                                            {e.employee_id
                                                ? `${e.employee_id} · ${e.department}`
                                                : `${e.employees_count} karyawan`}
                                        </small>
                                        <p className="analysis-numbers">
                                            {formatFte(e.total_fte)} FTE ·
                                            saving{" "}
                                            {formatFte(e.estimated_fte_saving)}
                                        </p>
                                        <p>{e.summary}</p>
                                        {e.employee_id && e.total_fte > 1 && (
                                            <p className="analysis-reading-guide">Beban aktivitas tercatat melebihi satu FTE berdasarkan asumsi volume, durasi, dan kapasitas tahunan. Verifikasi periode pencatatan, pembagian pekerjaan, dan durasi aktual sebelum menarik kesimpulan.</p>
                                        )}
                                        <h4>Peluang</h4>
                                        <p>{e.opportunities}</p>
                                        <h4>Pengawasan</h4>
                                        <p>{e.oversight_note}</p>
                                        <h4>Prioritas teratas</h4>
                                        {e.top_activities.map((a) => (
                                            <p key={a.activity_id}>
                                                {a.activity_id} ·{" "}
                                                {a.activity_name}{" "}
                                                <b>
                                                    {a.priority_score.toFixed(
                                                        2,
                                                    )}
                                                </b>
                                            </p>
                                        ))}
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
