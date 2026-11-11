import { Children, isValidElement, useEffect, useId, useRef, useState } from "react";
import type { SelectHTMLAttributes, ReactNode } from "react";
import { createPortal } from "react-dom";
import "../styles/select.css";

type Option = { value: string; label: ReactNode; disabled?: boolean };
export default function Select({ children, value, onChange, disabled, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    const id = useId();
    const trigger = useRef<HTMLButtonElement>(null);
    const popup = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 });
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
        const below = window.innerHeight - rect.bottom - 16;
        const height = Math.min(280, Math.max(100, below < 160 ? rect.top - 16 : below));
        setPosition({ top: below < 160 ? Math.max(8, rect.top - height - 6) : rect.bottom + 6, left: rect.left, width: rect.width, maxHeight: height });
        setActive(Math.max(0, selected));
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
        <button ref={trigger} type="button" role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-haspopup="listbox" aria-activedescendant={open ? `${id}-${active}` : undefined} aria-label={props["aria-label"]} disabled={disabled}
            onClick={() => open ? setOpen(false) : show()}
            onBlur={(e) => { if (!popup.current?.contains(e.relatedTarget)) setOpen(false); }}
            onKeyDown={(e) => {
                if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(e.key)) {
                    e.preventDefault();
                    if (!open) { show(); return; }
                    if (e.key === "Enter" || e.key === " ") { choose(active); return; }
                    const next = e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : (active + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
                    setActive(next);
                    document.getElementById(`${id}-${next}`)?.scrollIntoView({ block: "nearest" });
                } else if (e.key === "Escape" || e.key === "Tab") setOpen(false);
                else if (e.key.length === 1) {
                    const next = options.findIndex(o => String(o.label).toLowerCase().startsWith(e.key.toLowerCase()));
                    if (next >= 0) { if (!open) show(); setActive(next); }
                }
            }}>
            <span>{options[selected]?.label ?? "Pilih opsi"}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {createPortal(<div ref={popup} id={`${id}-list`} role="listbox" aria-label={props["aria-label"] ?? "Pilihan"} className={`select-popup ${open ? "is-open" : ""}`} style={position} inert={!open} onWheel={(e) => e.stopPropagation()}>
            {options.map((o, i) => <div key={o.value} id={`${id}-${i}`} role="option" aria-selected={selected === i} aria-disabled={o.disabled} className={active === i ? "is-active" : ""} onMouseDown={e => e.preventDefault()} onMouseMove={() => setActive(i)} onClick={() => choose(i)}><span>{o.label}</span>{selected === i && <span aria-hidden="true">✓</span>}</div>)}
        </div>, document.body)}
    </div>;
}
