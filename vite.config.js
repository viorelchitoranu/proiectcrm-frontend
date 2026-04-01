import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [react()],

    // Fix pentru sockjs-client — definește global ca window pentru compatibilitate browser
    define: {
        global: 'globalThis',
    },

    // ── Development server ────────────────────────────────────────────────────
    server: {
        proxy: {
            '/api': 'http://localhost:8080',
            '/ws':  'http://localhost:8080',  // proxy și pentru WebSocket
        }
    },

    // ── Production build ──────────────────────────────────────────────────────
    build: {
        // Elimină console.log și debugger din build-ul de producție.
        // În modul development (npm run dev) acestea rămân active.
        //
        // Ref: https://vite.dev/config/build-options#build-minify
        // Ref esbuild drop: https://esbuild.github.io/api/#drop
        esbuild: mode === 'production' ? {
            drop: ['console', 'debugger'],
        } : {},
    },
}))
