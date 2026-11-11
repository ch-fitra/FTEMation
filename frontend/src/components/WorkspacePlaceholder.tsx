// Reserve the page geometry while session and workload requests are pending.
export default function WorkspacePlaceholder({
    page = "/",
}: {
    page?: string;
}) {
    const overview = page === "/";
    return (
        <div
            className="workspace-placeholder"
            role="status"
            aria-label="Memuat halaman"
            aria-busy="true"
        >
            <span className="visually-hidden">Memuat halaman…</span>
            <div aria-hidden="true">
                {page === "/activities" ? (
                    <section className="panel placeholder-register">
                        <span className="placeholder-line short" />
                        <span className="placeholder-line heading" />
                        <div className="filters placeholder-filters">
                            {[0, 1, 2].map((item) => (
                                <div
                                    className="placeholder-control"
                                    key={item}
                                />
                            ))}
                        </div>
                        {Array.from({ length: 20 }, (_, row) => (
                            <div className="placeholder-activity" key={row}>
                                <span className="placeholder-line short" />
                                <span className="placeholder-line" />
                                <span className="placeholder-line short" />
                            </div>
                        ))}
                    </section>
                ) : (
                    <>
                        {overview && (
                            <div className="metrics">
                                {[0, 1, 2, 3].map((item) => (
                                    <div
                                        className={`metric ${item === 0 ? "metric-accent" : ""}`}
                                        key={item}
                                    >
                                        <span className="placeholder-line short" />
                                        <span className="placeholder-line value" />
                                        <span className="placeholder-line" />
                                    </div>
                                ))}
                            </div>
                        )}
                        <div
                            className={
                                overview ? "dashboard-grid" : "import-grid"
                            }
                        >
                            {[0, 1].map((item) => (
                                <div
                                    className="panel placeholder-panel"
                                    key={item}
                                >
                                    <span className="placeholder-line short" />
                                    <span className="placeholder-line heading" />
                                    {[0, 1, 2].map((row) => (
                                        <div
                                            className="placeholder-row"
                                            key={row}
                                        >
                                            <span className="placeholder-line short" />
                                            <span className="placeholder-line" />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        {!overview && (
                            <div className="panel placeholder-history">
                                <span className="placeholder-line heading" />
                                <div className="placeholder-row">
                                    <span className="placeholder-line" />
                                    <span className="placeholder-line" />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
