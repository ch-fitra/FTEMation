import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import Icon from "../components/Icon";
import SessionDialog from "../components/SessionDialog";
import type { SessionPhase } from "../components/SessionDialog";
import { api, errorMessages } from "../lib/http";
import type { User } from "../types/auth";

export default function LoginPage({
    onLogin,
}: {
    onLogin: (user: User) => void;
}) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [phase, setPhase] = useState<SessionPhase | null>(null);
    const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(
        null,
    );
    useEffect(() => {
        if (phase !== "success" || !authenticatedUser) return;
        const timer = window.setTimeout(() => onLogin(authenticatedUser), 1100);
        return () => window.clearTimeout(timer);
    }, [phase, authenticatedUser, onLogin]);
    async function submit(e: FormEvent) {
        e.preventDefault();
        if (busy || phase) return;
        setBusy(true);
        setPhase("pending");
        setErrors([]);
        try {
            await api.get("/sanctum/csrf-cookie");
            const { data } = await api.post("/api/login", {
                username,
                password,
            });
            setAuthenticatedUser(data.user);
            setPhase("success");
        } catch (err) {
            setErrors(errorMessages(err));
            setPhase("error");
        } finally {
            setBusy(false);
        }
    }
    return (
        <div className="login-layout">
            <section className="login-story">
                <span className="login-product">
                    WORKLOAD & AUTOMATION INTELLIGENCE
                </span>
                <div>
                    <span className="eyebrow">WORKLOAD INTELLIGENCE</span>
                    <h1>
                        Pahami aktivitas.
                        <br />
                        <span>Ukur beban kerja.</span>
                    </h1>
                    <p>
                        Kelola dataset workload dan telusuri perhitungan FTE
                        dengan dasar yang jelas, dari aktivitas hingga
                        departemen.
                    </p>
                    <div className="story-rule" />
                    <div className="story-steps">
                        <span>
                            <b>01</b> Import data
                        </span>
                        <span>
                            <b>02</b> Periksa aktivitas
                        </span>
                        <span>
                            <b>03</b> Tinjau FTE
                        </span>
                    </div>
                </div>
                <small>FTEMation · Workload assessment</small>
            </section>
            <main className="login-form">
                <div className="login-card">
                    <div className="login-identity">
                        <Link className="brand login-brand" to="/">
                            <BrandLogo />
                        </Link>
                        <span className="eyebrow">SELAMAT DATANG</span>
                        <h2>Masuk ke workspace</h2>
                    </div>
                    <form onSubmit={submit}>
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            disabled={busy || phase === "success"}
                            type="text"
                            autoComplete="username"
                            required
                            maxLength={100}
                            autoCapitalize="none"
                            spellCheck={false}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <label htmlFor="password">Password</label>
                        <div className="password-field">
                            <input
                                id="password"
                                disabled={busy || phase === "success"}
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                aria-label={
                                    showPassword
                                        ? "Sembunyikan password"
                                        : "Tampilkan password"
                                }
                                aria-pressed={showPassword}
                                aria-controls="password"
                                disabled={busy || phase === "success"}
                                onClick={() =>
                                    setShowPassword((value) => !value)
                                }
                            >
                                <Icon name={showPassword ? "eyeOff" : "eye"} />
                            </button>
                        </div>
                        <button
                            className="primary full login-submit"
                            disabled={busy || phase !== null}
                        >
                            {busy ? "Memproses…" : "Masuk"}
                        </button>
                    </form>
                </div>
            </main>
            {phase && phase !== "pending" && (
                <SessionDialog
                    phase={phase}
                    action="login"
                    errors={errors}
                    onClose={() =>
                        phase === "success" && authenticatedUser
                            ? onLogin(authenticatedUser)
                            : setPhase(null)
                    }
                />
            )}
        </div>
    );
}
