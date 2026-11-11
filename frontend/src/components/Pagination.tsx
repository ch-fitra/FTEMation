export default function Pagination({
    page,
    lastPage,
    onPage,
}: {
    page: number;
    lastPage: number;
    onPage: (page: number) => void;
}) {
    if (lastPage <= 1) return null;
    return (
        <div className="pagination">
            <button disabled={page <= 1} onClick={() => onPage(page - 1)}>
                ← Sebelumnya
            </button>
            <span>
                {page} / {lastPage}
            </span>
            <button
                disabled={page >= lastPage}
                onClick={() => onPage(page + 1)}
            >
                Berikutnya →
            </button>
        </div>
    );
}
