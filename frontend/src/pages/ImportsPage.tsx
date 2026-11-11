import { useState } from "react";
import type { FormEvent } from "react";
import ErrorAlert from "../components/ErrorAlert";
import Pagination from "../components/Pagination";
import Icon from "../components/Icon";
import { api, errorMessages } from "../lib/http";
import { formatDate } from "../lib/format";
import type { ImportItem } from "../types/workload";

export default function ImportsPage({
    imports,
    onImported,
    onSelect,
    onRefresh,
    page,
    lastPage,
    onPage,
}: {
    imports: ImportItem[];
    onImported: (item: ImportItem) => void;
    onSelect: (id: number) => void;
    onRefresh: () => void;
    page: number;
    lastPage: number;
    onPage: (page: number) => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [failureDetails, setFailureDetails] = useState<string[]>([]);
    async function submit(e: FormEvent) {
        e.preventDefault();
        if (!file) return;
        setErrors([]);
        if (
            file.size > 5 * 1024 * 1024 ||
            !file.name.toLowerCase().endsWith(".xlsx")
        ) {
            setErrors(["Pilih file .xlsx dengan ukuran maksimal 5 MB."]);
            return;
        }
        setBusy(true);
        try {
            const body = new FormData();
            body.append("file", file);
            const { data } = await api.post("/api/imports", body);
            onImported(data.import);
        } catch (err) {
            setErrors(errorMessages(err));
            onRefresh();
        } finally {
            setBusy(false);
        }
    }
    async function inspectFailure(id: number) {
        try {
            const { data } = await api.get(`/api/imports/${id}`);
            setFailureDetails(
                Object.values(data.validation_errors ?? {})
                    .flat()
                    .map(String),
            );
        } catch (err) {
            setErrors(errorMessages(err));
        }
    }
    return (
        <>
            <div className="import-grid">
                <section className="panel">
                    <span className="eyebrow">DATA SOURCE</span>
                    <h2>Import workbook Excel</h2>
                    <p className="muted">
                        Satu file, satu dataset. Import baru menyimpan riwayat
                        tersendiri.
                    </p>
                    <ErrorAlert messages={errors} />
                    <form onSubmit={submit}>
                        <label className="upload-zone" htmlFor="workbook">
                            <span className="empty-icon">
                                <Icon name="upload" />
                            </span>
                            <strong>
                                {file?.name ?? "Pilih workbook workload"}
                            </strong>
                            <span>.xlsx · maksimal 5 MB · sheet Workload</span>
                            <input
                                id="workbook"
                                type="file"
                                accept=".xlsx"
                                disabled={busy}
                                required
                                onChange={(e) =>
                                    setFile(e.target.files?.[0] ?? null)
                                }
                            />
                        </label>
                        <button className="primary" disabled={busy || !file}>
                            {busy
                                ? "Memvalidasi dan mengimpor…"
                                : "Validasi & import →"}
                        </button>
                    </form>
                </section>
                <section className="panel">
                    <span className="eyebrow">PANDUAN INPUT</span>
                    <h2>Sembilan kolom wajib</h2>
                    <p className="muted">
                        Header di baris pertama, sesuai urutan berikut.
                    </p>
                    <ol className="column-list">
                        {[
                            "activity_id",
                            "employee_id",
                            "employee_name",
                            "department",
                            "activity_name",
                            "description",
                            "frequency",
                            "volume",
                            "duration_minutes",
                        ].map((h) => (
                            <li key={h}>
                                <code>{h}</code>
                            </li>
                        ))}
                    </ol>
                    <p className="chart-note">
                        Angka positif, maksimal 6 desimal. Frekuensi: daily,
                        weekly, monthly. Workbook evaluasi AI tidak dapat
                        diimpor.
                    </p>
                </section>
            </div>
            <section className="panel">
                <div className="panel-heading">
                    <div>
                        <span className="eyebrow">RIWAYAT DATA</span>
                        <h2>Riwayat dataset</h2>
                    </div>
                    <span className="subtle-tag">
                        Halaman {page} / {lastPage}
                    </span>
                </div>
                {imports.length ? (
                    <div className="table-scroll">
                        <table
                            className="imports-table"
                            aria-label="Riwayat dataset"
                        >
                            <thead>
                                <tr>
                                    <th>Workbook</th>
                                    <th>Diunggah</th>
                                    <th>Aktivitas</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {imports.map((i) => (
                                    <tr key={i.id}>
                                        <td>
                                            <strong>{i.filename}</strong>
                                            <small>Import #{i.id}</small>
                                        </td>
                                        <td data-label="Diunggah">
                                            {formatDate(i.created_at)}
                                        </td>
                                        <td data-label="Aktivitas">
                                            {i.activities_count}
                                        </td>
                                        <td>
                                            <span
                                                className={`status ${i.status}`}
                                            >
                                                {
                                                    {
                                                        imported: "Berhasil",
                                                        failed: "Gagal",
                                                        pending: "Menunggu",
                                                    }[i.status]
                                                }
                                            </span>
                                        </td>
                                        <td>
                                            {i.status === "imported" ? (
                                                <button
                                                    className="text-button"
                                                    onClick={() =>
                                                        onSelect(i.id)
                                                    }
                                                >
                                                    Buka dataset →
                                                </button>
                                            ) : i.status === "failed" ? (
                                                <button
                                                    className="text-button"
                                                    onClick={() =>
                                                        inspectFailure(i.id)
                                                    }
                                                >
                                                    Lihat error
                                                </button>
                                            ) : (
                                                "Menunggu"
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="muted">
                        Belum ada dataset. Unggah file pertama untuk memulai.
                    </p>
                )}
                <Pagination page={page} lastPage={lastPage} onPage={onPage} />
                <ErrorAlert messages={failureDetails} />
            </section>
        </>
    );
}
