import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // For development server
  server: {
    port: 3001,
    host: '0.0.0.0',  // Listen on all interfaces for remote access
    proxy: {
      // Route /api requests directly to auth backend (when not using Kong prefix)
      '/api': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
      },
      // Route AUTH API requests through Kong Gateway (when using /auth prefix)
      '/auth/api': {
        target: 'http://localhost:8080',  // Kong Gateway
        changeOrigin: true,
        secure: false,
        // Forward cookies properly
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
        // Uncomment to bypass Kong and hit backend directly:
        // target: 'http://localhost:8003',
      },
      // Route SUPERADMIN API requests directly to auth backend
      '/superadmin/api': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
        headers: {
          'X-Forwarded-Host': '165.22.247.50',
          'X-Forwarded-Proto': 'http',
        },
      },
      // Static files and media (direct to backend)
      '/static': {
        target: 'http://localhost:8003',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8003',
        changeOrigin: true,
      },
    },
  },
  // For production build - use Django static paths
  build: {
    // Output to dist folder
    outDir: 'dist',
    // Generate manifest for Django integration
    manifest: true,
    rollupOptions: {
      output: {
        // Use consistent naming for easier Django template integration
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
