import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // For development server
  server: {
    port: 3001,
    host: '0.0.0.0',  // Listen on all interfaces for remote access
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '165.22.247.50',
      'mapactive.tech',
      'login.mapactive.tech',
      'app.mapactive.tech',
      '*.mapactive.tech',
      // Legacy domains (keep during transition)
      'ticketing.mapactive.tech',
      'login.ticketing.mapactive.tech',
      'app.ticketing.mapactive.tech',
      '*.ticketing.mapactive.tech',
    ],
    proxy: {
      // Route SUPERADMIN API requests through Kong Gateway
      '/superadmin/api': {
        target: 'https://api.ticketing.mapactive.tech',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
        headers: {
          'X-Forwarded-Host': '165.22.247.50',
          'X-Forwarded-Proto': 'http',
        },
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
