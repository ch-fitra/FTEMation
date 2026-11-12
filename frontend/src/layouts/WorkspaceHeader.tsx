import type { User } from "../types/auth";
import type { ReactNode } from "react";

interface WorkspaceHeaderProps {
    title: string;
    isOverview: boolean;
    user?: User;
    activitiesCount?: number;
    showActivitiesCount?: boolean;
    resultsView?: boolean;
    resultsActionsRef?: (node: HTMLDivElement | null) => void;
    datasetControl?: ReactNode;
}

export default function WorkspaceHeader({
    title,
    isOverview,
    user,
    activitiesCount,
    showActivitiesCount,
    resultsView,
    resultsActionsRef,
    datasetControl,
}: WorkspaceHeaderProps) {
    return (
        <header className={`topbar${datasetControl ? " topbar-with-dataset" : ""}${resultsActionsRef ? resultsView ? " topbar-results" : " topbar-analysis" : ""}`}>
            <h1 className="workspace-title">{title}</h1>
            {datasetControl}
            <div className="header-actions">
                {resultsActionsRef && <div className="header-results-slot">
                    <div className="header-actions-placeholder" aria-hidden="true">
                        {resultsView ? <><span className="header-skeleton history-skeleton" /><div className="export-skeletons">{[1, 2, 3].map(i => <span key={i} className="header-skeleton" />)}</div></> :
                            <section className="header-metadata-placeholder"><strong className="analysis-metadata-title">Memuat metadata</strong>{["Run", "Model", "Status", "Request AI", "Token", "Aktivitas dari cache"].map(label => <span key={label}><b>{label}</b> <i className="header-skeleton" /></span>)}</section>}
                    </div>
                    <div className="results-header-actions" ref={resultsActionsRef} />
                </div>}
                {showActivitiesCount && (
                    <span className="subtle-tag header-activity-count" aria-busy={activitiesCount === undefined}>{activitiesCount === undefined ? <span className="header-skeleton" aria-label="Memuat jumlah aktivitas" /> : `${activitiesCount} aktivitas`}</span>
                )}
                {isOverview && user && (
                    <div className="user-menu">
                        <span className="avatar">{user.name.charAt(0)}</span>
                        <span>{user.name}</span>
                    </div>
                )}
            </div>
        </header>
    );
}
