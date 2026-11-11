import { createPortal } from "react-dom";
import ActivityAnalysisDialog from "../components/ActivityAnalysisDialog";
import Select from "../components/Select";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ErrorAlert from "../components/ErrorAlert";
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
export default function AnalysisPage({
    importId,
    onComplete,
    model,
    view = "process",
    headerTarget,
}: {
    importId: number | null;
    onComplete: () => void;
    model?: string;
    view?: "process" | "results";
    headerTarget?: HTMLElement | null;
}) {
    const resultsView = view === "results";
    const [params, setParams] = useSearchParams();
    const dialog = useRef<HTMLDialogElement>(null);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);
    const activityId = params.get("activity");
    const requestedRun = Number(params.get("run"));
    function openDetail(id: string) {
        setParams({ dataset: String(importId), run: String(runId), activity: id });
    }
    const [history, setHistory] = useState<{ id: number; status: string }[]>(
        [],
    );
    const [runId, setRunId] = useState<number | null>(null);
    const [fetchedRun, setRun] = useState<AnalysisRun | null>(null);
    const run = fetchedRun?.id === runId && (!requestedRun || fetchedRun.id === requestedRun) ? fetchedRun : null;
    const selectedActivity = run?.report?.activities.find((a) => a.activity_id === activityId);
    useEffect(() => {
        if (selectedActivity) dialog.current?.showModal();
        else if (!activityId) dialog.current?.close();
    }, [selectedActivity, activityId]);
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
                if (controller.signal.aborted) return;
                setHistory(data);
                setRunId((id) =>
                    requestedRun > 0 ? requestedRun : data.some((r: { id: number }) => r.id === id)
                        ? id
                        : ((resultsView ? data.find((r: { status: string }) => r.status === "completed") : data[0])?.id ?? null),
                );
            })
            .catch((e) => {
                if (!controller.signal.aborted) setErrors(errorMessages(e));
            });
        return () => controller.abort();
    }, [importId, version, requestedRun, resultsView]);
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
                if (data.import_id !== importId) {
                    setErrors(["Run ini bukan bagian dari dataset aktif. Pilih run yang sesuai dari riwayat."]);
                    return;
                }
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
        if (!window.confirm("Analisis mengirim data aktivitas ke layanan AI dan dapat menggunakan saldo API. Lanjutkan?")) return;
        setBusy(true);
        setErrors([]);
        try {
            const { data } = await api.post(
                retry
                    ? `/api/analyses/${runId}/retry`
                    : `/api/imports/${importId}/analyses`,
            );
            if (!mounted.current) return;
            setRun(null);
            setRunId(data.run.id);
            setParams({ dataset: String(importId), run: String(data.run.id) });
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
            <ActivityAnalysisDialog dialogRef={dialog} activity={selectedActivity} savingRate={report?.calculation.saving_rates[selectedActivity?.automation_level ?? ""]} onClose={() => {
                if (!params.has("activity")) return;
                const next = new URLSearchParams(params);
                next.delete("activity");
                setParams(next, { replace: true });
            }} />
            {!resultsView && <section className="panel analysis-toolbar">
                <div>
                    <h2>Proses analisis dataset</h2>
                    <p>
                        {report ? `Hasil run ${runId}. Melihat hasil sebelumnya tidak membutuhkan request AI baru.` : `Penilaian teks menggunakan layanan DeepSeek${model ? ` (${model})` : ""}. FTE dan saving dihitung oleh Laravel.`}
                    </p>
                </div>
                <button
                    className={report ? "secondary" : "primary"}
                    disabled={busy || !!active}
                    onClick={() => void start()}
                >
                    {busy
                        ? "Memproses…"
                        : active
                          ? "Analisis berjalan"
                          : report ? "Analisis Ulang" : "Mulai analisis"}
                </button>
            </section>}
            <ErrorAlert messages={errors} />
            {!resultsView && run && headerTarget && createPortal(
                    <section className="analysis-metadata" aria-label="Metadata hasil analisis">
                        <strong className="analysis-metadata-title">Metadata analisis</strong>
                        <span><b>Run</b> {runId}</span>
                        <span><b>Model</b> {run.actual_model ?? run.model_name}</span>
                        <span><b>Status</b> {statusLabel[run.status] ?? run.status}</span>
                        <span><b>Request AI</b> {run.requests_count}</span>
                        <span><b>Token</b> {run.input_tokens + run.output_tokens}</span>
                        <span><b>Aktivitas dari cache</b> {run.cache_hits}</span>
                    </section>
            , headerTarget)}
            {resultsView && headerTarget && createPortal(<>
                {history.length > 0 && (
                <label className="results-history">
                    <span className="visually-hidden">Riwayat analisis</span>
                    <Select
                        aria-label="Riwayat analisis"
                        value={runId ?? ""}
                        onChange={(e) => {
                            setRun(null);
                            setRunId(Number(e.target.value));
                            setParams({ dataset: String(importId), run: e.target.value });
                        }}
                    >
                        {run && !history.some((r) => r.id === runId) && <option value={run.id}>Analisis {run.id} (tautan langsung)</option>}
                        {history.map((r) => (
                            <option key={r.id} value={r.id}>
                                Analisis {r.id} ·{" "}
                                {statusLabel[r.status] ?? r.status}
                            </option>
                        ))}
                    </Select>
                </label>)}
                {report && run?.status === "completed" && <div className="analysis-exports" aria-label="Unduh hasil analisis">
                    {[ ["xlsx", "Unduh Excel"], ["pdf", "Unduh PDF"], ["json", "Unduh JSON"] ].map(([format, label]) => <button key={format} disabled={!!download} onClick={() => void exportFile(format)}>{download === format ? "Menyiapkan..." : label}</button>)}
                </div>}
            </>, headerTarget)}
            {!run && (
                <p role="status">
                    {runId
                        ? "Memuat hasil analisis…"
                        : resultsView ? "Belum ada hasil lengkap. Jalankan analisis di halaman Analisis AI." : "Belum ada analisis. Mulai untuk menilai seluruh aktivitas dalam dataset ini."}
                </p>
            )}
            {resultsView && run && run.status !== "completed" && <p className="alert">Run ini belum selesai. <Link to={`/analysis?dataset=${importId}&run=${runId}`}>Pantau proses di Analisis AI</Link></p>}
            {!resultsView && run && run.status !== "completed" && (
                <section className="panel analysis-status" aria-live="polite">
                    <div>
                        <strong>{statusLabel[run.status] ?? run.status}</strong>
                        <p>{run.progress.success ?? 0} dari {run.total} aktivitas berhasil dianalisis ({Math.floor((run.progress.success ?? 0) / Math.max(1, run.total) * 100)}%). {run.progress.failed ?? 0} gagal.</p>
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
                        <details className="analysis-error"><summary>Detail kendala analisis</summary><p>{run.error_message}</p></details>
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
            {!resultsView && report && run?.status === "completed" && (
                <section className="panel"><h2>Analisis selesai</h2><p>Seluruh hasil siap ditinjau. Buka halaman hasil untuk rekomendasi, kelompok aktivitas, dan export.</p><Link className="button primary" to={`/results?dataset=${importId}&run=${runId}`}>Lihat hasil analisis</Link></section>
            )}
            {resultsView && report && run?.status === "completed" && (
                <>
                    <section className="panel analysis-results">
                        <details className="analysis-reading-guide">
                            <summary>Cara membaca hasil</summary>
                            <p>Mulai dari prioritas tertinggi. Saving adalah estimasi kapasitas waktu dalam FTE; skor prioritas mempertimbangkan saving, risiko, dan kesulitan implementasi.</p>
                            <span>High: mayoritas langkah · Medium: sebagian langkah · Low: bantuan terbatas. Keputusan dan pengawasan tetap pada manusia.</span>
                            <p>Persetujuan rutin berarti manusia menyetujui setiap transaksi. Review pengecualian berlaku untuk kasus di luar kriteria. Keputusan final berisiko tetap pada manusia berwenang. Label AI tidak merinci seluruh jenis kontrol; konfirmasi peran dan pemicu bersama pemilik proses.</p>
                            <p>Skor prioritas bukan probabilitas keberhasilan. Estimated saving belum menjadi efisiensi yang terealisasi.</p>
                        </details>
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
                        <div className="analysis-distribution" aria-label="Jumlah aktivitas per level otomatisasi">
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
                                                <th>Aktivitas / departemen</th>
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
                                                        <button className="text-button" onClick={() => openDetail(a.activity_id)}>Lihat detail →</button>
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
