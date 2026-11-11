export default function ErrorAlert({ messages }: { messages: string[] }) {
    if (!messages.length) return null;
    const unique = [...new Set(messages)];
    const groups = unique.reduce((map, m) => { const key = m.match(/^Baris \d+/)?.[0] ?? "Umum"; map.set(key, [...(map.get(key) ?? []), m]); return map; }, new Map<string, string[]>());
    return (
        <div className="alert error" role="alert">
            <strong>Permintaan belum berhasil</strong>
            <p>{unique.length} kesalahan perlu diperiksa.</p>
            {Array.from(groups, ([row, items]) => <div key={row}>{row !== "Umum" && <strong>{row}</strong>}<ul>{items.map((m) => <li key={m}>{m}</li>)}</ul></div>)}
        </div>
    );
}
