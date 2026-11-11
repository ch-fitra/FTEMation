import {
    Navigate,
    Route,
    Routes,
    useLocation,
    useNavigate,
} from "react-router-dom";
import { useEffect, useLayoutEffect, useState } from "react";
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
    const [resultsHeader, setResultsHeader] = useState<HTMLDivElement | null>(null);
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
    useEffect(() => {
        const previous = window.history.scrollRestoration;
        window.history.scrollRestoration = "manual";
        return () => { window.history.scrollRestoration = previous; };
    }, []);
    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, [currentPath, workload.selectedId]);
    const currentPage =
        workspaceNavigation.find((item) => item.path === currentPath) ??
        workspaceNavigation[0];

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
                    analysisAction={currentPath === "/" && !workload.loading && workload.summary ? {
                        to: `${workload.summary.analysis_run_id ? "/results" : "/analysis"}?dataset=${workload.selectedId}${workload.summary.analysis_run_id ? `&run=${workload.summary.analysis_run_id}` : ""}`,
                        label: workload.summary.analysis_run_id ? "Lihat hasil analisis" : ["queued", "processing"].includes(workload.summary.analysis_status) ? "Lihat progres analisis" : "Mulai analisis AI",
                    } : undefined}
                    datasetControl={["/", "/results", "/activities"].includes(currentPath) ? (
                        <label className="header-dataset">
                            <span>Dataset aktif</span>
                            <Select singleLineOptions value={workload.selectedId ?? ""} aria-label="Dataset aktif" onChange={(e) => {
                                workload.selectImport(Number(e.target.value));
                                navigate(`${currentPath}?dataset=${e.target.value}`);
                            }}>
                                <option value="" disabled>Pilih dataset</option>
                                {workload.selectedImport && !workload.imports.some((i) => i.id === workload.selectedId) && <option value={workload.selectedId!}>{workload.selectedImport.filename}</option>}
                                {workload.imports.filter((i) => i.status === "imported").map((i) => <option key={i.id} value={i.id}>{i.filename}</option>)}
                            </Select>
                        </label>
                    ) : undefined}
                    user={user}
                    resultsActionsRef={["/results", "/analysis"].includes(currentPath) ? setResultsHeader : undefined}
                    activitiesCount={currentPath === "/activities" && !workload.loading ? workload.summary?.activities_count : undefined}
                />
                <main className="content">
                    <ErrorAlert messages={workload.errors} />
                    {workload.loading ? (
                        <WorkspacePlaceholder page={currentPath} />
                    ) : workload.errors.length > 0 &&
                      !workload.summary ? null : (
                        <Routes>
                            <Route
                                path="/results"
                                element={<AnalysisPage key={`results-${workload.selectedId}`} view="results" headerTarget={resultsHeader} importId={workload.selectedId} model={workload.summary?.analysis_model} onComplete={workload.refreshImports} />}
                            />
                            <Route
                                path="/analysis"
                                element={
                                    <AnalysisPage
                                        key={workload.selectedId}
                                        headerTarget={resultsHeader}
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
