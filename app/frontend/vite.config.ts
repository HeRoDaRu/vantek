/**
 * ──────────────────────────────────────────────────────────────────────────────
 * vite.config.ts — Vite build & dev-server configuration
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Configures the React plugin, path aliases, the dev server (port 5173 with an
 *   /api proxy to the backend), and the production build output directory.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · vite (defineConfig) → typed config helper
 *     · @vitejs/plugin-react → JSX/Fast-Refresh support
 *     · path (resolve) → absolute alias targets
 *   Used by:
 *     · Vite CLI for `vite` (dev) and `vite build` (produces ./dist)
 *
 * PATH ALIASES
 *   · @          → ./src
 *   · @components → ./src/components
 *   · @ui        → ./src/components/UI
 *   · @store     → ./src/store
 *   · @pages     → ./src/pages
 *   · @utils     → ./src/utils
 *   · @hooks     → ./src/hooks
 *
 * INPUTS / OUTPUTS
 *   Input:  source under ./src
 *   Output: bundled SPA in ./dist (emptyOutDir on each build)
 *
 * NOTES
 *   · Dev server proxies /api → http://127.0.0.1:3000 (changeOrigin); in Docker
 *     nginx handles the same /api proxy in production.
 *   · Aliases must stay in sync with tsconfig.json paths for type resolution.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@ui': resolve(__dirname, './src/components/UI'),
      '@store': resolve(__dirname, './src/store'),
      '@pages': resolve(__dirname, './src/pages'),
      '@utils': resolve(__dirname, './src/utils'),
      '@hooks': resolve(__dirname, './src/hooks'),
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: './dist',
    emptyOutDir: true
  }
})