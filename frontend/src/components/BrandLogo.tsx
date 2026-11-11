import logoUrl from "../assets/brand/ftemation-logo.webp";

export default function BrandLogo() {
    return (
        <img
            className="brand-logo"
            src={logoUrl}
            alt="FTEMation"
            width={492}
            height={328}
            fetchPriority="high"
        />
    );
}
