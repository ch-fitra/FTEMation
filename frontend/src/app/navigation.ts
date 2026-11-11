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
        title: "Ruang kerja assessment",
        icon: "overview",
    },
    {
        path: "/imports",
        label: "Import dataset",
        title: "Import dataset",
        icon: "upload",
    },
    {
        path: "/activities",
        label: "Data aktivitas",
        title: "Data aktivitas",
        icon: "activities",
    },
    {
        path: "/analysis",
        label: "Analisis AI",
        title: "Analisis otomatisasi",
        icon: "chart",
    },
];
