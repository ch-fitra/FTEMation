import type { User } from "../types/auth";

interface WorkspaceHeaderProps {
    title: string;
    isOverview: boolean;
    user?: User;
}

export default function WorkspaceHeader({
    title,
    isOverview,
    user,
}: WorkspaceHeaderProps) {
    return (
        <header className="topbar">
            <h1 className="workspace-title">{title}</h1>
            <div className="header-actions">
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
