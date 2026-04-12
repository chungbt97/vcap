import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import webExtension from 'vite-plugin-web-extension'

export default defineConfig({
  base: '', // Extension HTML requires relative paths under chrome-extension://
  plugins: [
    react(),
    webExtension({
      manifest: 'manifest.json',
      watchFilePaths: ['manifest.json'],
      additionalInputs: [
        'src/popup/popup.html',
        'src/panel/panel.html',
        'src/offscreen/offscreen.html',
        'src/preview/index.html',
      ],
    }),
  ],
  build: {
    minify: true,
    sourcemap: false,
  },
})
