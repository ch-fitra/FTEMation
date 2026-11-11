import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, errorMessages } from "../lib/http";
import type { Page } from "../types/api";
import type { ImportItem, Summary } from "../types/workload";

// Shared dataset selection for overview, imports, and activities.
export function useWorkload() {
    const [params] = useSearchParams();
    const requestedId = Number(params.get("dataset")) || null;
    const [imports, setImports] = useState<ImportItem[]>([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyLast, setHistoryLast] = useState(1);
    const [localId, setSelectedId] = useState<number | null>(requestedId);
    const selectedId = requestedId ?? localId;
    const [summaryDatasetId, setSummaryDatasetId] = useState<number | null>(null);
    const [selectedImport, setSelectedImport] = useState<ImportItem | null>(null);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    useEffect(() => {
        let active = true;
        api.get<Page<ImportItem>>("/api/imports", {
            params: { page: historyPage },
        })
            .then(({ data }) => {
                if (!active) return;
                setImports(data.data);
                setHistoryLast(data.last_page);
                setSelectedId(
                    (id) =>
                        id ??
                        data.data.find((i) => i.status === "imported")?.id ??
                        null,
                );
            })
            .catch((err) => {
                if (active) setErrors(errorMessages(err));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [refreshKey, historyPage]);
    useEffect(() => {
        if (!selectedId) return;
        let active = true;
        api.get(`/api/imports/${selectedId}`)
            .then(({ data }) => {
                if (active) {
                    setSelectedId(selectedId);
                    setSummary(data.summary);
                    setSummaryDatasetId(selectedId);
                    setSelectedImport(data.import);
                }
            })
            .catch((err) => {
                if (active) setErrors(errorMessages(err));
            });
        return () => {
            active = false;
        };
    }, [selectedId, refreshKey]);
    function selectImport(id: number) {
        if (id !== selectedId) {
            setSummary(null);
            setSelectedImport(null);
            setErrors([]);
            setSelectedId(id);
        }
    }
    function imported(item: ImportItem) {
        selectImport(item.id);
        setHistoryPage(1);
        setRefreshKey((k) => k + 1);
    }
    return {
        imports,
        selectedImport: summaryDatasetId === selectedId ? selectedImport : null,
        historyPage,
        historyLast,
        selectedId,
        summary: summaryDatasetId === selectedId ? summary : null,
        errors,
        // Import history can finish before its selected dataset summary.
        // Do not expose the empty state during that second request.
        loading:
            loading ||
            (selectedId !== null && (summary === null || summaryDatasetId !== selectedId) && errors.length === 0),
        setHistoryPage,
        selectImport,
        imported,
        refreshImports: () => setRefreshKey((key) => key + 1),
        reportError: (error: unknown) => setErrors(errorMessages(error)),
    };
}
