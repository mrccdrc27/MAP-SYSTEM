import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false, // Allow fallback to other ports
    host: '0.0.0.0',
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '165.22.247.50',
      'hdts.ticketing.mapactive.tech',
      'ticketing.mapactive.tech',
      '*.ticketing.mapactive.tech',
    ],
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
      // Workflow API DIRECT to workflow_api service (not Kong)
      // This allows cookie-based auth to work since we're going through auth service
      '/workflow': {
        target: 'http://localhost:1001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/workflow/, ''),
      },
      // Messaging Service
      '/messaging': {
        target: 'http://localhost:1002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/messaging/, ''), 
        websocket: true,
      },
    },
  },
})
