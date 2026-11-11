import {
    Navigate,
    Route,
    Routes,
    useLocation,
    useNavigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import SessionDialog from "../components/SessionDialog";
import type { SessionPhase } from "../components/SessionDialog";
import { workspaceNavigation } from "../app/navigation";
import ErrorAlert from "../components/ErrorAlert";
import WorkspacePlaceholder from "../components/WorkspacePlaceholder";
import { useWorkload } from "../hooks/useWorkload";
import { api, errorMessages } from "../lib/http";
import ActivitiesPage from "../pages/ActivitiesPage";
import ImportsPage from "../pages/ImportsPage";
import OverviewPage from "../pages/OverviewPage";
import AnalysisPage from "../pages/AnalysisPage";
import type { User } from "../types/auth";
import type { ImportItem } from "../types/workload";
import WorkspaceHeader from "./WorkspaceHeader";
import Select from "../components/Select";
import WorkspaceSidebar from "./WorkspaceSidebar";

export default function WorkspaceLayout({
    user,
    onLogout,
}: {
    user: User;
    onLogout: () => void;
}) {
    const workload = useWorkload();
    const [logoutPhase, setLogoutPhase] = useState<SessionPhase | null>(null);
    const [logoutErrors, setLogoutErrors] = useState<string[]>([]);
    useEffect(() => {
        if (logoutPhase !== "success") return;
        const timer = window.setTimeout(onLogout, 1100);
        return () => window.clearTimeout(timer);
    }, [logoutPhase, onLogout]);
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const currentPath = pathname.replace(/\/+$/, "") || "/";
    const currentPage =
        workspaceNavigation.find((item) => item.path === currentPath) ??
        workspaceNavigation[0];

    const analysisStatus = workload.summary ? ({ completed: "Selesai", queued: "Dalam antrean", processing: "Sedang dianalisis", failed: "Gagal", partial_failed: "Sebagian gagal", not_started: "Belum dianalisis" } as Record<string, string>)[workload.summary.analysis_status] ?? workload.summary.analysis_status : "Belum dianalisis";

    async function logout() {
        if (logoutPhase !== "confirm") return;
        setLogoutPhase("pending");
        try {
            await api.post("/api/logout");
            setLogoutPhase("success");
        } catch (error) {
            setLogoutErrors(errorMessages(error));
            setLogoutPhase("error");
        }
    }

    function selectImport(id: number) {
        workload.selectImport(id);
        navigate("/");
    }

    function imported(item: ImportItem) {
        workload.imported(item);
        navigate("/");
    }

    return (
        <div className="workspace">
            <WorkspaceSidebar importId={workload.selectedId} onLogout={() => setLogoutPhase("confirm")} />
            <div className="main-shell">
                <WorkspaceHeader
                    title={currentPage.title}
                    isOverview={currentPath === "/"}
                    user={user}
                />
                <main className="content">
                    <section className="dataset-context" aria-label="Dataset aktif" aria-busy={workload.loading}>
                        <label>DATASET AKTIF
                            <Select value={workload.selectedId ?? ""} aria-label="Dataset aktif" onChange={(e) => { workload.selectImport(Number(e.target.value)); navigate(`${currentPath}?dataset=${e.target.value}`); }}>
                                <option value="" disabled>Pilih dataset</option>
                                {workload.selectedImport && !workload.imports.some((i) => i.id === workload.selectedId) && <option value={workload.selectedId!}>{workload.selectedImport.filename} · #{workload.selectedId}</option>}
                                {workload.imports.filter((i) => i.status === "imported").map((i) => <option key={i.id} value={i.id}>{i.filename} · #{i.id}</option>)}
                            </Select>
                        </label>
                        <p role="status">{workload.loading ? "Memuat konteks dataset…" : workload.summary ? `${workload.summary.activities_count} aktivitas · ${workload.summary.employees_count} karyawan · ${workload.summary.departments_count} departemen` : "Belum ada dataset"}<br />{workload.summary?.analysis_run_id ? `Hasil lengkap: Run #${workload.summary.analysis_run_id} · Status terbaru: ${analysisStatus}` : `Hasil analisis belum tersedia | ${analysisStatus}`}</p>
                    </section>
                    <ErrorAlert messages={workload.errors} />
                    {workload.loading ? (
                        <WorkspacePlaceholder page={currentPath} />
                    ) : workload.errors.length > 0 &&
                      !workload.summary ? null : (
                        <Routes>
                            <Route
                                path="/analysis"
                                element={
                                    <AnalysisPage
                                        key={workload.selectedId}
                                        importId={workload.selectedId}
                                        model={workload.summary?.analysis_model}
                                        onComplete={workload.refreshImports}
                                    />
                                }
                            />
                            <Route
                                path="/"
                                element={
                                    <OverviewPage
                                        importId={workload.selectedId}
                                        summary={workload.summary}
                                        hasImports={workload.imports.length > 0}
                                    />
                                }
                            />
                            <Route
                                path="/imports"
                                element={
                                    <ImportsPage
                                        imports={workload.imports}
                                        onImported={imported}
                                        onSelect={selectImport}
                                        onRefresh={workload.refreshImports}
                                        page={workload.historyPage}
                                        lastPage={workload.historyLast}
                                        onPage={workload.setHistoryPage}
                                    />
                                }
                            />
                            <Route
                                path="/activities"
                                element={
                                    <ActivitiesPage
                                        key={workload.selectedId}
                                        importId={workload.selectedId}
                                        summary={workload.summary}
                                    />
                                }
                            />
                            <Route
                                path="*"
                                element={<Navigate to="/" replace />}
                            />
                        </Routes>
                    )}
                </main>
            </div>
            {logoutPhase && (
                <SessionDialog
                    action="logout"
                    phase={logoutPhase}
                    errors={logoutErrors}
                    onConfirm={logout}
                    onClose={() =>
                        logoutPhase === "success"
                            ? onLogout()
                            : setLogoutPhase(null)
                    }
                />
            )}
        </div>
    );
}
