import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false, // Allow fallback to other ports
    // Proxy API requests - makes cookies same-origin
    proxy: {
      // Auth service endpoints
      '/api': {
        target: 'http://localhost:8003',
        changeOrigin: true,
      },
      // Helpdesk backend DIRECT (not Kong) - so cookies work
      '/helpdesk': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/helpdesk/, ''),
      },
      // Media files from helpdesk backend - served at /api/media/
      '/media': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => '/api' + path,  // /media/... -> /api/media/...
      },
      // Workflow API through Kong (uses header auth)
      '/workflow': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
