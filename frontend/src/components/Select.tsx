import { Children, isValidElement, useEffect, useId, useRef, useState } from "react";
import type { SelectHTMLAttributes, ReactNode } from "react";
import { createPortal } from "react-dom";
import "../styles/select.css";

type Option = { value: string; label: ReactNode; disabled?: boolean };
export default function Select({ children, value, onChange, disabled, singleLineOptions = false, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { singleLineOptions?: boolean }) {
    const id = useId();
    const trigger = useRef<HTMLButtonElement>(null);
    const popup = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [position, setPosition] = useState<{top?: number; bottom?: number; left: number; width: number; maxHeight: number}>({ top: 0, left: 0, width: 0, maxHeight: 280 });
    const options: Option[] = Children.toArray(children).filter(isValidElement).map(child => {
        const p = child.props as { value?: string | number; children: ReactNode; disabled?: boolean };
        return { value: String(p.value ?? p.children), label: p.children, disabled: p.disabled };
    });
    const selected = options.findIndex(o => o.value === String(value ?? ""));
    useEffect(() => {
        if (!open) return;
        const close = (event: Event) => {
            if (popup.current?.contains(event.target as Node) || trigger.current?.contains(event.target as Node)) return;
            setOpen(false);
        };
        window.addEventListener("pointerdown", close);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            window.removeEventListener("pointerdown", close);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, [open]);
    function show() {
        const rect = trigger.current!.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth;
        const below = window.innerHeight - rect.bottom - 14;
        const above = rect.top - 14;
        const upwards = below < 160 && above > below;
        const height = Math.min(280, Math.max(0, upwards ? above : below));
        const width = Math.min(singleLineOptions ? Math.max(rect.width, 600) : rect.width, viewportWidth - 16);
        const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));
        setPosition({ ...(upwards ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }), left, width, maxHeight: height });
        setActive(selected >= 0 && !options[selected].disabled ? selected : Math.max(0, options.findIndex(o => !o.disabled)));
        setOpen(true);
    }
    function choose(index: number) {
        const option = options[index];
        if (!option || option.disabled) return;
        if (option.value !== String(value ?? "")) onChange?.({ target: { value: option.value }, currentTarget: { value: option.value } } as React.ChangeEvent<HTMLSelectElement>);
        setOpen(false);
        trigger.current?.focus();
    }
    return <div className="custom-select">
        <button ref={trigger} id={props.id} type="button" role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-haspopup="listbox" aria-activedescendant={open ? `${id}-${active}` : undefined} aria-label={props["aria-label"]} aria-labelledby={props["aria-labelledby"]} disabled={disabled}
            onClick={() => open ? setOpen(false) : show()}
            onBlur={(e) => { if (!popup.current?.contains(e.relatedTarget)) setOpen(false); }}
            onKeyDown={(e) => {
                if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(e.key)) {
                    e.preventDefault();
                    if (!open) { show(); return; }
                    if (e.key === "Enter" || e.key === " ") { choose(active); return; }
                    const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
                    if (!enabled.length) return;
                    const next = e.key === "Home" ? enabled[0] : e.key === "End" ? enabled.at(-1)! : enabled[(enabled.indexOf(active) + (e.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length];
                    setActive(next);
                    document.getElementById(`${id}-${next}`)?.scrollIntoView({ block: "nearest" });
                } else if (e.key === "Escape" || e.key === "Tab") setOpen(false);
                else if (e.key.length === 1) {
                    const next = options.findIndex(o => !o.disabled && String(o.label).toLowerCase().startsWith(e.key.toLowerCase()));
                    if (next >= 0) { if (!open) show(); setActive(next); }
                }
            }}>
            <span>{options[selected]?.label ?? "Pilih opsi"}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {createPortal(<div ref={popup} id={`${id}-list`} role="listbox" aria-label={props["aria-label"] ?? "Pilihan"} className={`select-popup ${singleLineOptions ? "select-popup-single-line" : ""} ${open ? "is-open" : ""}`} style={position} inert={!open} onWheel={(e) => e.stopPropagation()}>
            {options.map((o, i) => <div key={o.value} id={`${id}-${i}`} role="option" aria-selected={selected === i} aria-disabled={o.disabled} className={active === i ? "is-active" : ""} onMouseDown={e => e.preventDefault()} onMouseMove={() => setActive(i)} onClick={() => choose(i)}><span title={singleLineOptions && typeof o.label === "string" ? o.label : undefined}>{o.label}</span>{selected === i && <span aria-hidden="true">✓</span>}</div>)}
        </div>, document.body)}
    </div>;
}
