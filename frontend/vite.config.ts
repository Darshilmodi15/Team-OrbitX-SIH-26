import { defineConfig } from 'vitest/config'
import { offlineTripReader } from './tooling/offline-plugin.js'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    offlineTripReader(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react/') || id.includes('/node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('/node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }
          if (id.includes('/node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('/node_modules/leaflet')) {
            return 'vendor-leaflet';
          }
          if (id.includes('src/lib/orca/audit-translations') || id.includes('src/lib/orca/i18n')) {
            return 'orca-i18n';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    clearMocks: true,
  },
})
