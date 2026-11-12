import { Link, NavLink } from "react-router-dom";
import { workspaceNavigation } from "../app/navigation";
import mark from "../assets/brand/ftemation-mark.svg";
import Icon from "../components/Icon";

export default function WorkspaceSidebar({
    onLogout,
    importId,
}: {
    importId?: number | null;
    onLogout?: () => void;
}) {
    return (
        <aside className="sidebar">
            <Link className="brand" to={importId ? `/?dataset=${importId}` : "/"}>
                <img
                    className="sidebar-mark"
                    src={mark}
                    width="38"
                    height="38"
                    alt=""
                />
                <span>
                    FTEMation<span className="brand-dot">.</span>
                    <small>WORKLOAD INTELLIGENCE</small>
                </span>
            </Link>
            <span className="nav-label">WORKSPACE</span>
            <nav aria-label="Navigasi workspace">
                {workspaceNavigation.map((item) => (
                    <NavLink
                        key={item.path}
                        end={item.path === "/"}
                        to={importId ? `${item.path}?dataset=${importId}` : item.path}
                    >
                        <Icon name={item.icon} /> {item.label}
                    </NavLink>
                ))}
            </nav>
            <div className="sidebar-bottom">
                <span className="sidebar-session">
                    <span className="session-dot" />
                    Workspace pribadi
                </span>
                {onLogout && (
                    <button className="sidebar-logout" onClick={onLogout}>
                        <Icon name="logout" />
                        Keluar
                    </button>
                )}
            </div>
        </aside>
    );
}
