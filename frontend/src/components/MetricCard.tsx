import Icon from "./Icon";
import type { IconName } from "./Icon";
import type { CSSProperties } from "react";

export default function MetricCard({
    label,
    value,
    detail,
    accent = false,
    icon,
    unit,
}: {
    label: string;
    value: string;
    detail: string;
    accent?: boolean;
    icon?: IconName;
    unit?: string;
}) {
    return (
        <section className={`metric ${accent ? "metric-accent" : ""}`} style={{ "--metric-length": Math.max(1, value.length) } as CSSProperties}>
            <div className="metric-heading">
                <span>{label}</span>
                {icon && <Icon name={icon} />}
            </div>
            <div className="metric-value">
                <strong>{value}</strong>
                {unit && <span>{unit}</span>}
            </div>
            <small>{detail}</small>
        </section>
    );
}
