import { useEffect, useRef } from "react";
import Icon from "./Icon";

export type SessionPhase = "confirm" | "pending" | "success" | "error";

export default function SessionDialog({
    phase,
    action,
    errors = [],
    onConfirm,
    onClose,
}: {
    phase: SessionPhase;
    action: "login" | "logout";
    errors?: string[];
    onConfirm?: () => void;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const login = action === "login";
    const titles = {
        confirm: "Apakah Anda yakin?",
        pending: "Memproses...",
        success: login ? "Berhasil masuk" : "Berhasil keluar",
        error: login ? "Gagal masuk" : "Gagal keluar",
    };
    useEffect(() => {
        const dialog = ref.current;
        const previous = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialog?.showModal();
        return () => {
            dialog?.close();
            document.body.style.overflow = previousOverflow;
            if (previous?.isConnected) previous.focus();
        };
    }, []);
    useEffect(() => {
        ref.current
            ?.querySelector<HTMLButtonElement>("[data-autofocus]")
            ?.focus();
    }, [phase]);
    return (
        <dialog
            ref={ref}
            className="session-dialog"
            data-phase={phase}
            aria-labelledby="session-dialog-title"
            aria-describedby="session-dialog-description"
            onCancel={(event) => {
                event.preventDefault();
                if (phase !== "pending") onClose();
            }}
        >
            <div
                className={`session-symbol session-symbol-${phase}`}
                aria-hidden="true"
            >
                {phase === "pending" ? (
                    <span className="spinner" />
                ) : phase === "confirm" ? (
                    <span className="session-warning-mark">!</span>
                ) : (
                    <Icon name={phase === "success" ? "check" : "close"} />
                )}
            </div>
            <div aria-live="polite" aria-atomic="true">
                <h2 id="session-dialog-title">{titles[phase]}</h2>
                <div id="session-dialog-description">
                    {phase === "confirm" && (
                        <p>Anda akan keluar dari workspace.</p>
                    )}
                    {phase === "pending" && (
                        <p>Menunggu respons dari server.</p>
                    )}
                    {phase === "success" && (
                        <p>
                            {login
                                ? "Selamat datang di FTEMation."
                                : "Anda telah keluar dari FTEMation."}
                        </p>
                    )}
                    {phase === "error" &&
                        errors.map((message) => <p key={message}>{message}</p>)}
                </div>
            </div>
            {phase === "confirm" && (
                <div className="session-dialog-actions">
                    <button className="primary" onClick={onConfirm}>
                        Yakin
                    </button>
                    <button data-autofocus onClick={onClose}>
                        Batal
                    </button>
                </div>
            )}
            {(phase === "error" || (phase === "success" && !login)) && (
                <div className="session-dialog-actions">
                    <button
                        data-autofocus
                        className="primary"
                        onClick={onClose}
                    >
                        OK
                    </button>
                </div>
            )}
        </dialog>
    );
}
