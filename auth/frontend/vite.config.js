import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // For development server
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
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
