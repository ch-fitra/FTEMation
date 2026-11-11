import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ErrorAlert from "../components/ErrorAlert";
import { useSession } from "../hooks/useSession";
import WorkspaceLayout from "../layouts/WorkspaceLayout";
import SessionLoading from "../components/SessionLoading";
import LoginPage from "../pages/LoginPage";

export default function App() {
    const { user, setUser, loading, errors } = useSession();
    if (errors.length)
        return (
            <main className="app-loading">
                <ErrorAlert messages={errors} />
                <button onClick={() => window.location.reload()}>
                    Coba lagi
                </button>
            </main>
        );
    return (
        <BrowserRouter>
            {loading ? (
                <SessionLoading />
            ) : user ? (
                <WorkspaceLayout user={user} onLogout={() => setUser(null)} />
            ) : (
                <Routes>
                    <Route path="/" element={<LoginPage onLogin={setUser} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            )}
        </BrowserRouter>
    );
}
