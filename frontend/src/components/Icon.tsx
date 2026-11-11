import type { ReactNode } from "react";

export type IconName =
    | "overview"
    | "upload"
    | "activities"
    | "clock"
    | "users"
    | "chart"
    | "info"
    | "logout"
    | "check"
    | "close"
    | "shield";

const paths: Record<IconName, ReactNode> = {
    close: <path d="m6 6 12 12M6 18 18 6" />,
    logout: (
        <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4m6-12 4 4-4 4m-8-4h12" />
    ),
    check: <path d="m5 12 4 4L19 6" />,
    overview: (
        <>
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </>
    ),
    upload: (
        <>
            <path d="M12 16V3m-5 5 5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
        </>
    ),
    activities: (
        <>
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 8h8M8 12h8M8 16h5" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    users: (
        <>
            <circle cx="9" cy="8" r="3" />
            <path d="M3 21v-2a6 6 0 0 1 12 0v2m2-16a3 3 0 0 1 0 6m4 10v-2a6 6 0 0 0-4-5.65" />
        </>
    ),
    chart: (
        <>
            <path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4" />
        </>
    ),
    info: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v6m0-10v.01" />
        </>
    ),
    shield: (
        <>
            <path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z" />
            <path d="m8 12 3 3 5-6" />
        </>
    ),
};

export default function Icon({
    name,
    className = "",
}: {
    name: IconName;
    className?: string;
}) {
    return (
        <svg
            className={`icon ${className}`}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {paths[name]}
        </svg>
    );
}
