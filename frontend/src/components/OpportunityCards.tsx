import { Link } from "react-router-dom";
import { formatFte } from "../lib/format";
import type { AnalysisActivity } from "../types/analysis";

export default function OpportunityCards({ activities, importId, runId, spotlight = false, onDetail }: {
    activities: AnalysisActivity[];
    importId: number | null;
    runId: number | null;
    spotlight?: boolean;
    onDetail?: (id: string) => void;
}) {
    return <div className="opportunity-grid">{activities.slice(0, 3).map((a, i) => <article key={a.activity_id}>
        <span className={`level level-${a.automation_level}`}>{i + 1} · {a.automation_level}</span>
        <h3>{a.activity_name}</h3><p>{a.department} · Risiko {a.risk_level} · Effort {a.effort_level}</p>
        <strong>{formatFte(a.estimated_fte_saving)} FTE saving</strong>
        <p title="Skor prioritas bukan probabilitas keberhasilan.">Prioritas {a.priority_score.toFixed(2)}</p>
        {spotlight && i === 0 && <p>{a.recommendation}</p>}
        {onDetail ? <button onClick={() => onDetail(a.activity_id)}>Lihat Detail</button> : <Link className="button" to={`/results?dataset=${importId}&run=${runId}&activity=${encodeURIComponent(a.activity_id)}`}>Lihat Detail Analisis →</Link>}
    </article>)}</div>;
}
