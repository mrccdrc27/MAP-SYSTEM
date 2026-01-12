import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true,
    host: '0.0.0.0',
    port: 1000,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '165.22.247.50',
      'ticketflow.ticketing.mapactive.tech',
      'ticketing.mapactive.tech',
      '*.ticketing.mapactive.tech',
    ],
  }
})



