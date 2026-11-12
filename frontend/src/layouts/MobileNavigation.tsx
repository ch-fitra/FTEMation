import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { workspaceNavigation } from "../app/navigation";
import Icon from "../components/Icon";
import mark from "../assets/brand/ftemation-mark.svg";

export default function MobileNavigation({ importId, onLogout }: { importId?: number | null; onLogout: () => void }) {
    const [openLocation, setOpenLocation] = useState<string | null>(null);
    const container = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const location = useLocation();
    const open = openLocation === location.key;
    const setOpen = (value: boolean) => setOpenLocation(value ? location.key : null);
    const destination = (path: string) => importId ? `${path}?dataset=${importId}` : path;

    useEffect(() => {
        if (!open) return;
        function outside(event: PointerEvent) {
            if (!container.current?.contains(event.target as Node)) setOpenLocation(null);
        }
        function escape(event: KeyboardEvent) {
            if (event.key === "Escape") { setOpenLocation(null); trigger.current?.focus(); }
        }
        function resize() { if (window.innerWidth > 650) setOpenLocation(null); }
        document.addEventListener("pointerdown", outside);
        document.addEventListener("keydown", escape);
        window.addEventListener("resize", resize);
        return () => {
            document.removeEventListener("pointerdown", outside);
            document.removeEventListener("keydown", escape);
            window.removeEventListener("resize", resize);
        };
    }, [open]);

    return <>
        <div className="mobile-header">
            <Link className="mobile-brand" to={destination("/")} aria-label="FTEMation Overview">
                <img src={mark} width="28" height="28" alt="" />
                <span>FTEMation<span className="brand-dot">.</span></span>
            </Link>
            <div className="mobile-more" ref={container} onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
            }}>
                <button ref={trigger} className="mobile-more-trigger" aria-label="Menu lainnya" aria-expanded={open} aria-controls="mobile-more-options" onClick={() => setOpen(!open)}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        {[5, 12, 19].map(y => <circle key={y} cx="12" cy={y} r="1.8" />)}
                    </svg>
                </button>
                {open && <div className="mobile-more-options" id="mobile-more-options">
                    <Link to={destination("/help")} onClick={() => setOpen(false)}><Icon name="info" />Pusat Bantuan</Link>
                    <button onClick={() => { setOpen(false); onLogout(); }}><Icon name="logout" />Keluar</button>
                </div>}
            </div>
        </div>
        <nav className="mobile-bottom-nav" aria-label="Navigasi mobile">
            {["/imports", "/analysis", "/", "/results", "/activities"].map(path => {
                const item = workspaceNavigation.find(item => item.path === path)!;
                return <NavLink key={path} end={path === "/"} to={destination(path)} className={path === "/" ? "mobile-nav-overview" : undefined}>
                    <span className="mobile-nav-icon"><Icon name={item.icon} /></span>
                    <span>{item.label}</span>
                </NavLink>;
            })}
        </nav>
    </>;
}
