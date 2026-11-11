export default function ErrorAlert({ messages }: { messages: string[] }) {
    if (!messages.length) return null;
    return (
        <div className="alert error" role="alert">
            <strong>Permintaan belum berhasil</strong>
            <ul>
                {messages.map((m, i) => (
                    <li key={i}>{m}</li>
                ))}
            </ul>
        </div>
    );
}
