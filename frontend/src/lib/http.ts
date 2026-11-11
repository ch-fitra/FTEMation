import axios from "axios";

export const api = axios.create({
    baseURL: "/",
    withCredentials: true,
    withXSRFToken: true,
    headers: { Accept: "application/json" },
});

export function errorMessages(error: unknown): string[] {
    if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 419)
            return ["Sesi kedaluwarsa. Muat ulang halaman lalu masuk kembali."];
        const errors = error.response?.data?.errors;
        if (errors && typeof errors === "object")
            return Object.values(errors).flat().map(String);
        if (status === 413)
            return [
                "Ukuran unggahan terlalu besar. Maksimal 5 MB; periksa juga upload_max_filesize PHP.",
            ];
        if (status && status >= 500)
            return [
                "Server gagal memproses permintaan. Periksa koneksi database dan storage/logs/laravel.log.",
            ];
        return [
            error.response?.data?.message ??
                "Tidak dapat menghubungi server. Pastikan Laravel berjalan di localhost:8000.",
        ];
    }
    return ["Permintaan gagal. Muat ulang halaman dan coba lagi."];
}
