import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',   
    port: 3000
  },
  preview: {
    host: '127.0.0.1',
    port: 4300,
    allowedHosts: [
      'frontend-production-906f.up.railway.app',
      '.railway.app',
      'localhost',
      '127.0.0.1'
    ]
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})