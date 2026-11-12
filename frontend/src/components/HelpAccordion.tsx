import { useId, useState, type ReactNode } from "react";

export default function HelpAccordion({ question, number, id, children }: {
    question: string;
    number: number;
    id?: string;
    children: ReactNode;
}) {
    const [expanded, setExpanded] = useState(false);
    const uid = useId();
    return <article id={id} className={`help-item${expanded ? " is-expanded" : ""}`}>
        <h2 className="help-question">
            <button id={`${uid}-question`} type="button" aria-expanded={expanded} aria-controls={`${uid}-answer`} onClick={() => setExpanded(value => !value)}>
                <span className="help-number" aria-hidden="true">{String(number).padStart(2, "0")}</span>
                <span className="help-question-text">{question}</span>
                <span className="help-toggle" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="m5.5 7.75 4.5 4.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            </button>
        </h2>
        <div id={`${uid}-answer`} className="help-answer" role="region" aria-labelledby={`${uid}-question`} aria-hidden={!expanded} inert={!expanded}>
            <div className="help-answer-clip"><div className="help-answer-content">{children}</div></div>
        </div>
    </article>;
}
