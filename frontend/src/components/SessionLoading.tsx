import mark from "../assets/brand/ftemation-mark.svg";

// No route-specific or private interface before the server verifies the session.
export default function SessionLoading() {
    return (
        <main
            className="session-gate"
            role="status"
            aria-label="Memeriksa sesi"
            aria-busy="true"
        >
            <div className="session-gate-content">
                <div className="session-gate-brand">
                    <img src={mark} alt="" width="32" height="32" />
                    <strong>FTEMation</strong>
                </div>
                <p>
                    <span className="spinner" aria-hidden="true" />
                    Memeriksa sesi Anda
                </p>
            </div>
        </main>
    );
}
