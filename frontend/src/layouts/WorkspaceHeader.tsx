import type { User } from "../types/auth";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

interface WorkspaceHeaderProps {
    title: string;
    isOverview: boolean;
    user?: User;
    activitiesCount?: number;
    analysisAction?: { to: string; label: string };
    resultsActionsRef?: (node: HTMLDivElement | null) => void;
    datasetControl?: ReactNode;
}

export default function WorkspaceHeader({
    title,
    isOverview,
    user,
    activitiesCount,
    analysisAction,
    resultsActionsRef,
    datasetControl,
}: WorkspaceHeaderProps) {
    return (
        <header className={`topbar${datasetControl ? " topbar-with-dataset" : ""}`}>
            <h1 className="workspace-title">{title}</h1>
            {datasetControl}
            <div className="header-actions">
                {resultsActionsRef && <div className="results-header-actions" ref={resultsActionsRef} />}
                {analysisAction && (
                    <Link className="button primary" to={analysisAction.to}>{analysisAction.label}</Link>
                )}
                {activitiesCount !== undefined && (
                    <span className="subtle-tag">{activitiesCount} aktivitas</span>
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
