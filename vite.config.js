import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],

    // Fix pentru sockjs-client — definește global ca window pentru compatibilitate browser
    define: {
        global: 'globalThis',
    },

    server: {
        proxy: {
            '/api': 'http://localhost:8080',
            '/ws':  'http://localhost:8080',  // proxy și pentru WebSocket
        }
    }
})
