import { useEffect, useRef, useState } from "react";
import type { AnalysisRun, Report } from "../types/analysis";
import Icon from "./Icon";
import "../styles/ai-result-review.css";

type ReviewGroup = NonNullable<AnalysisRun["consistency_review"]>[number];

// Display labels only; the original group IDs and classifications stay intact.
const categoryLabels: Record<string, string> = {
    structured_record_entry: "Input data terstruktur",
    rule_based_validation: "Validasi berdasarkan aturan",
    periodic_reporting: "Pelaporan berkala",
    standard_followup: "Pengingat dan tindak lanjut rutin",
    exception_investigation: "Penelusuran masalah dan pengecualian",
    data_reconciliation: "Pencocokan data",
    human_negotiation: "Negosiasi",
    assisted_classification: "Pengelompokan dengan bantuan AI",
    contextual_analysis: "Analisis kontekstual",
    complex_accounting_adjustment: "Penyesuaian akuntansi khusus",
    supervisory_approval: "Persetujuan pimpinan",
    kpi_monitoring: "Pemantauan kinerja",
    planning_forecasting: "Perencanaan dan proyeksi",
    scheduling_coordination: "Penjadwalan dan koordinasi",
    high_impact_decision: "Keputusan berdampak besar",
    master_data_update: "Pembaruan data induk",
    templated_document: "Penyusunan dokumen standar",
    routine_qa_response: "Jawaban atas pertanyaan rutin",
    human_interview: "Wawancara dan penilaian kandidat",
    quotation_comparison: "Perbandingan penawaran",
};
const factorLabels: Record<string, string> = {
    repetitiveness: "Pengulangan", rule_clarity: "Kejelasan aturan", data_structure: "Struktur data",
    human_judgment: "Pertimbangan manusia", operational_risk: "Risiko operasional",
};
const levelLabels: Record<string, string> = { high: "High", medium: "Medium", low: "Low" };

function Levels({ group }: { group: ReviewGroup }) {
    const counts = group.activities.reduce<Record<string, number>>((levels, activity) => {
        levels[activity.automation_level] = (levels[activity.automation_level] ?? 0) + 1;
        return levels;
    }, {});
    return <span className="ai-review-levels" aria-label="Variasi tingkat otomatisasi">
        {Object.entries(counts).sort(([a], [b]) => ["high", "medium", "low"].indexOf(a) - ["high", "medium", "low"].indexOf(b)).map(([level, count]) =>
            <span key={level} className={`level level-${level}`}>{levelLabels[level] ?? level} <b>{count}</b></span>)}
    </span>;
}

export default function AiResultReview({ groups, reportGroups }: { groups: ReviewGroup[]; reportGroups: Report["groups"] }) {
    const [selected, setSelected] = useState<ReviewGroup | null>(null);
    const [expanded, setExpanded] = useState(false);
    const dialog = useRef<HTMLDialogElement>(null);
    const opener = useRef<HTMLButtonElement | null>(null);
    function category(group: ReviewGroup) {
        return categoryLabels[group.group_id] ?? reportGroups.find((item) => item.group_id === group.group_id)?.name ?? group.group_id.replaceAll("_", " ");
    }
    useEffect(() => {
        if (!selected) return;
        dialog.current?.showModal();
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previous; };
    }, [selected]);
    if (!groups.length) return null;
    return <section className="ai-review" aria-labelledby="ai-review-title">
        <div className="ai-review-heading">
            <span className="ai-review-icon" aria-hidden="true"><Icon name="shield" /></span>
            <div><h2 id="ai-review-title">Pemeriksaan Hasil AI</h2><p>{groups.length} kelompok untuk ditinjau</p></div>
        </div>
        <p className="ai-review-intro">Beberapa kelompok pekerjaan sejenis memiliki tingkat otomatisasi berbeda. Perbedaan ini belum tentu kesalahan AI; kebutuhan penilaian manusia dan risiko tiap aktivitas bisa berbeda.</p>
        <ul className="ai-review-list" id="ai-review-groups">
            {(expanded ? groups : groups.slice(0, 3)).map((group) => <li key={group.group_id}>
                <button className="ai-review-group" type="button" aria-haspopup="dialog" onClick={(event) => { opener.current = event.currentTarget; setSelected(group); }}>
                    <span className="ai-review-group-name"><strong>{category(group)}</strong><span>{group.activities.length} aktivitas</span></span>
                    <Levels group={group} />
                    <span className="ai-review-action">Lihat detail <span aria-hidden="true">→</span></span>
                </button>
            </li>)}
        </ul>
        {groups.length > 3 && <button type="button" className="text-button ai-review-more" aria-expanded={expanded} aria-controls="ai-review-groups" onClick={() => setExpanded(!expanded)}>{expanded ? "Tampilkan lebih sedikit" : `Lihat semua ${groups.length} kelompok`}</button>}
        <dialog ref={dialog} className="activity-dialog ai-review-dialog" aria-labelledby="ai-review-dialog-title" aria-describedby="ai-review-dialog-intro" onClose={() => { setSelected(null); opener.current?.focus(); }}>
            <header className="activity-dialog-header">
                <div><span className="eyebrow">PEMERIKSAAN HASIL AI</span><h2 id="ai-review-dialog-title">{selected ? category(selected) : "Detail kelompok"}</h2>{selected && <p>{selected.activities.length} aktivitas dalam kelompok ini</p>}</div>
                <button type="button" className="activity-dialog-close" autoFocus aria-label="Tutup pemeriksaan hasil AI" onClick={() => dialog.current?.close()}><Icon name="close" /></button>
            </header>
            {selected && <div className="activity-dialog-body ai-review-body" tabIndex={0} aria-label="Detail aktivitas dalam kelompok">
                <p id="ai-review-dialog-intro">Bandingkan pekerjaan dan alasan AI di bawah. Tingkat yang berbeda dapat sesuai dengan kebutuhan masing-masing aktivitas.</p>
                <Levels group={selected} />
                <p className="ai-review-legend">Tingkat otomatisasi: High (tinggi), Medium (sedang), Low (rendah).</p>
                <div className="ai-review-activities">{selected.activities.map((activity) => <article key={activity.activity_id} className="ai-review-activity">
                    <div className="ai-review-activity-heading"><h3>{activity.activity_name}</h3><span className={`level level-${activity.automation_level}`}>{levelLabels[activity.automation_level] ?? activity.automation_level}</span></div>
                    <p className="ai-review-identity">{activity.activity_id} · {activity.department}</p>
                    <h4>Alasan klasifikasi AI</h4><p className="ai-review-reason">{activity.reason}</p>
                    {activity.factors && <dl className="ai-review-factors">{Object.entries(activity.factors).map(([key, value]) => <div key={key}><dt>{factorLabels[key] ?? key}</dt><dd>{levelLabels[value] ?? value}</dd></div>)}</dl>}
                </article>)}</div>
            </div>}
        </dialog>
    </section>;
}
