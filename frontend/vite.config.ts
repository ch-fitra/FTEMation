import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
    plugins: [react()],
    base: command === "build" ? "/build/" : "/",
    server: {
        host: "localhost",
        port: 5173,
        strictPort: true,
        proxy: {
            "/api": { target: "http://localhost:8000", changeOrigin: true },
            "/sanctum": { target: "http://localhost:8000", changeOrigin: true },
        },
    },
    build: { outDir: "../public/build", emptyOutDir: true },
}));
