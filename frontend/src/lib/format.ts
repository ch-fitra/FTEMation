export const formatFte = (n: number | string) =>
    Number(n).toLocaleString("id-ID", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
    });
export const formatDate = (v: string) =>
    new Date(v).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
    });
