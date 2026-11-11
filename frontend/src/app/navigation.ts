// One source for sidebar links and workspace header titles.
import type { IconName } from "../components/Icon";

interface NavigationItem {
    path: string;
    label: string;
    title: string;
    icon: IconName;
}

export const workspaceNavigation: NavigationItem[] = [
    {
        path: "/",
        label: "Overview",
        title: "Dashboard assessment",
        icon: "overview",
    },
    {
        path: "/imports",
        label: "Import dataset",
        title: "Import dataset",
        icon: "upload",
    },
    {
        path: "/analysis",
        label: "Analisis AI",
        title: "Analisis otomatisasi",
        icon: "chart",
    },
    {
        path: "/results",
        label: "Hasil analisis",
        title: "Hasil analisis AI",
        icon: "check",
    },
    {
        path: "/activities",
        label: "Data aktivitas",
        title: "Data aktivitas",
        icon: "activities",
    },
];
