import type { RefObject } from "react";
import { formatFte } from "../lib/format";
import { useEffect, useRef } from "react";
import Icon from "./Icon";
import type { AnalysisActivity } from "../types/analysis";

const factorLabels: Record<string, string> = {
    repetitiveness: "Pengulangan", rule_clarity: "Kejelasan aturan", data_structure: "Struktur data",
    human_judgment: "Pertimbangan manusia", operational_risk: "Risiko operasional",
};

export default function ActivityAnalysisDialog({ dialogRef, activity, savingRate, onClose }: {
    dialogRef: RefObject<HTMLDialogElement | null>;
    activity?: AnalysisActivity;
    savingRate?: number;
    onClose: () => void;
}) {
    const closingAnimation = useRef<Animation | null>(null);
    useEffect(() => () => closingAnimation.current?.cancel(), []);
    function closeDetail() {
        const dialog = dialogRef.current;
        if (!dialog?.open || closingAnimation.current) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            dialog.close();
            return;
        }
        const animation = dialog.animate([
            { opacity: 1, transform: "translateY(0) scale(1)" },
            { opacity: 0, transform: "translateY(8px) scale(.98)" },
        ], { duration: 140, easing: "ease-in", fill: "forwards" });
        closingAnimation.current = animation;
        void animation.finished.then(() => {
            if (dialog.isConnected && dialog.open) dialog.close();
            animation.cancel();
            closingAnimation.current = null;
        }).catch(() => { closingAnimation.current = null; });
    }
    return <dialog aria-label="Detail analisis aktivitas" className="activity-dialog" ref={dialogRef} onClose={() => {
        closingAnimation.current?.cancel();
        closingAnimation.current = null;
        onClose();
    }} onCancel={(event) => {
        event.preventDefault();
        closeDetail();
    }}>
        <header className="activity-dialog-header">
            <div>
                {activity && <>
                    <h2>{activity.activity_name}</h2>
                    <div className="activity-dialog-identity">
                        <p>{activity.activity_id} · {activity.department} · {activity.employee_name}</p>
                        <span className={`level level-${activity.automation_level}`}>{activity.automation_level}</span>
                    </div>
                </>}
            </div>
            <button className="activity-dialog-close" type="button" autoFocus aria-label="Tutup detail" title="Tutup detail (Esc)" onClick={closeDetail}><Icon name="close" /></button>
        </header>
        {activity && <article className="activity-dialog-body" tabIndex={0} aria-label="Isi detail analisis">
            <h3>Alasan klasifikasi</h3><p>{activity.reason}</p>
            <dl className="analysis-factors">{Object.entries(activity.factors).map(([key, value]) =>
                <div key={key}><dt>{factorLabels[key] ?? key}</dt><dd>{value}</dd></div>)}</dl>
            <h3>Rekomendasi AI</h3><p>{activity.recommendation}</p>
            <p>Risiko: {activity.risk_level} · Implementation effort: {activity.effort_level}</p>
            <h3>Human oversight</h3>
            <p>{activity.oversight_required ? "Kontrol manusia wajib." : "Kontrol tidak diwajibkan label; bukan jaminan tanpa manusia. Konfirmasi review pengecualian dengan pemilik proses."} {activity.oversight_note}</p>
            <p>Oversight dapat berupa persetujuan rutin, review pengecualian, atau kewenangan keputusan final manusia.</p>
            <h3>FTE & estimasi saving</h3>
            <p>{formatFte(activity.fte)} FTE × asumsi saving {savingRate == null ? "—" : `${savingRate * 100}%`} = {formatFte(activity.estimated_fte_saving)} FTE.</p>
            <p>FTE berasal dari volume × menit × faktor tahunan / kapasitas tahunan pada snapshot run. Prioritas {activity.priority_score.toFixed(2)} mempertimbangkan saving, risiko, dan effort; bukan probabilitas keberhasilan.</p>
            <p>Estimasi kapasitas waktu, bukan pengurangan jumlah karyawan atau efisiensi yang sudah terealisasi.</p>
            <h3>Grouping terkait</h3><p>{activity.group_id} · {activity.group_name}</p>
        </article>}
    </dialog>;
}
