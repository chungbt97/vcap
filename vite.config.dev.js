import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only config: serves src/preview as a normal React app with HMR.
// Mock data is injected in main.jsx when chrome.storage is unavailable.
export default defineConfig({
  plugins: [react()],
  root: 'src/preview',
  publicDir: false,
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: '../../dist-preview',
  },
  resolve: {
    alias: {
      // Stub chrome.* APIs in dev mode
      '../utils/zipExporter.js': '../utils/zipExporter.js',
    },
  },
})
