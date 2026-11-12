import { useEffect, useRef } from "react";
import Icon from "./Icon";

export default function AnalysisActionDialog({ action, filename, runId, busy, errors, onConfirm, onClose }: {
    action: "cancel" | "resume";
    filename: string;
    runId: number | null;
    busy: boolean;
    errors: string[];
    onConfirm: () => void;
    onClose: () => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const cancel = action === "cancel";
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow;
        const element = dialog.current;
        document.body.style.overflow = "hidden";
        element?.showModal();
        element?.querySelector<HTMLButtonElement>("[data-safe-focus]")?.focus();
        return () => {
            element?.close();
            document.body.style.overflow = overflow;
            if (previous?.isConnected) previous.focus();
        };
    }, []);
    return <dialog ref={dialog} className="analysis-action-dialog" aria-labelledby="analysis-action-title" aria-describedby="analysis-action-description" aria-busy={busy} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
        <header><span className={`analysis-action-icon${cancel ? " is-cancel" : ""}`} aria-hidden="true"><Icon name={cancel ? "info" : "chart"} /></span><button type="button" className="analysis-action-close" aria-label="Tutup konfirmasi" disabled={busy} onClick={onClose}><Icon name="close" /></button></header>
        <h2 id="analysis-action-title">{cancel ? "Batalkan analisis ini?" : "Lanjutkan analisis ini?"}</h2>
        <div className="analysis-action-dataset"><strong>{filename}</strong><span>Analisis {runId}</span></div>
        <div id="analysis-action-description">
            <p>{cancel ? "Hasil aktivitas yang sudah selesai tetap tersimpan. Analisis berhenti pada titik aman berikutnya." : "Hanya aktivitas yang belum berhasil dan kesimpulan yang belum selesai akan diproses. Prompt dan model tetap memakai pengaturan asli analisis ini."}</p>
            <p className="analysis-action-note">{cancel ? "Request AI yang sudah dikirim tidak dapat ditarik kembali dan mungkin tetap dikenakan biaya. Anda dapat melanjutkan analisis ini nanti." : "Melanjutkan analisis dapat mengirim data ke DeepSeek dan menggunakan saldo API."}</p>
        </div>
        {errors.length > 0 && <div role="alert" className="analysis-action-error">{errors.map(message => <p key={message}>{message}</p>)}</div>}
        <footer><button type="button" className="secondary" data-safe-focus autoFocus disabled={busy} onClick={onClose}>{cancel ? "Tetap lanjutkan" : "Nanti saja"}</button><button type="button" className={cancel ? "analysis-cancel-button" : "primary"} disabled={busy} onClick={onConfirm}>{busy ? "Memproses..." : cancel ? "Ya, batalkan analisis" : "Ya, lanjutkan analisis"}</button></footer>
    </dialog>;
}
