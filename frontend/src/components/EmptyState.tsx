import Icon, { type IconName } from "./Icon";

export default function EmptyState({ icon, title, description }: {
    icon: IconName;
    title: string;
    description: string;
}) {
    return (
        <section className="analysis-empty" role="status">
            <span className="analysis-empty-icon" aria-hidden="true"><Icon name={icon} /></span>
            <h2>{title}</h2>
            <p>{description}</p>
        </section>
    );
}
