import Select from "../components/Select";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ErrorAlert from "../components/ErrorAlert";
import Pagination from "../components/Pagination";
import WorkspacePlaceholder from "../components/WorkspacePlaceholder";
import { api, errorMessages } from "../lib/http";
import { formatFte } from "../lib/format";
import type { Activity, Summary } from "../types/workload";
import type { Page } from "../types/api";

export default function ActivitiesPage({
    importId,
    summary,
}: {
    importId: number | null;
    summary: Summary | null;
}) {
    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("");
    const [frequency, setFrequency] = useState("");
    const [page, setPage] = useState(1);
    const [result, setResult] = useState<Page<Activity> | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!importId) return;
        const controller = new AbortController();
        const timer = setTimeout(
            () => {
                setLoading(true);
                setErrors([]);
                api.get<Page<Activity>>(`/api/imports/${importId}/activities`, {
                    params: { search, department, frequency, page },
                    signal: controller.signal,
                })
                    .then(({ data }) => setResult(data))
                    .catch((err) => {
                        if (!controller.signal.aborted)
                            setErrors(errorMessages(err));
                    })
                    .finally(() => {
                        if (!controller.signal.aborted) setLoading(false);
                    });
            },
            search ? 250 : 0,
        );
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [importId, search, department, frequency, page]);
    if (!importId)
        return (
            <div className="panel empty">
                <h2>Belum ada dataset aktif</h2>
                <Link to="/imports">Import dataset →</Link>
            </div>
        );
    if (!result && loading) return <WorkspacePlaceholder page="/activities" />;
    return (
        <section className="panel activity-register" aria-busy={loading}>
            <span className="visually-hidden" role="status">
                {loading ? "Memuat aktivitas…" : ""}
            </span>
            <div className="panel-heading">
                <div>
                    <h2>Daftar aktivitas</h2>
                </div>
                <span className="subtle-tag">
                    {result?.total ?? "…"} aktivitas
                </span>
            </div>
            <div className="filters">
                <label>
                    Cari aktivitas atau karyawan
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Kode, nama aktivitas, atau karyawan…"
                    />
                </label>
                <label>
                    Departemen
                    <Select
                        value={department}
                        onChange={(e) => {
                            setDepartment(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">Semua departemen</option>
                        {summary?.departments.map((d) => (
                            <option key={d.department}>{d.department}</option>
                        ))}
                    </Select>
                </label>
                <label>
                    Frekuensi
                    <Select
                        value={frequency}
                        onChange={(e) => {
                            setFrequency(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">Semua frekuensi</option>
                        {["daily", "weekly", "monthly"].map((f) => (
                            <option key={f}>{f}</option>
                        ))}
                    </Select>
                </label>
            </div>
            <ErrorAlert messages={errors} />
            <p className="table-hint">
                Geser tabel untuk melihat kolom lainnya.
            </p>
            <>
                <div
                    className="table-scroll"
                    role="region"
                    aria-label="Tabel aktivitas workload"
                    tabIndex={0}
                >
                    <table>
                        <thead>
                            <tr>
                                <th>Aktivitas</th>
                                <th>Karyawan / Departemen</th>
                                <th>Frekuensi</th>
                                <th className="number">Volume</th>
                                <th className="number">Menit / unit</th>
                                <th className="number">FTE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result?.data.map((a) => (
                                <tr key={a.id}>
                                    <td className="activity-cell">
                                        <small className="activity-code">
                                            {a.activity_code}
                                        </small>
                                        <strong>{a.activity_name}</strong>
                                        <details>
                                            <summary>
                                                Deskripsi & perhitungan
                                            </summary>
                                            <p>{a.description}</p>
                                            <code>
                                                {Number(a.volume)} ×{" "}
                                                {Number(a.duration_minutes)} ×{" "}
                                                {
                                                    summary?.calculation
                                                        .annual_factors[
                                                        a.frequency
                                                    ]
                                                }{" "}
                                                /{" "}
                                                {
                                                    summary?.calculation
                                                        .annual_capacity_minutes
                                                }{" "}
                                                = {a.fte}
                                            </code>
                                        </details>
                                    </td>
                                    <td>
                                        <strong>{a.employee.name}</strong>
                                        <small>
                                            {a.employee.employee_code} ·{" "}
                                            {a.employee.department}
                                        </small>
                                    </td>
                                    <td>
                                        <span className="frequency">
                                            {a.frequency}
                                        </span>
                                    </td>
                                    <td className="number">
                                        {Number(a.volume)}
                                    </td>
                                    <td className="number">
                                        {Number(a.duration_minutes)}
                                    </td>
                                    <td className="number fte-value">
                                        {formatFte(a.fte)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {result?.data.length === 0 && (
                    <div className="empty">
                        <h3>Tidak ada aktivitas yang cocok</h3>
                        <p>Coba kata kunci atau filter lain.</p>
                    </div>
                )}
                <Pagination
                    page={page}
                    lastPage={result?.last_page ?? 1}
                    onPage={setPage}
                />
            </>
        </section>
    );
}
