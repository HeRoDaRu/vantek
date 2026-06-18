/**
 * ──────────────────────────────────────────────────────────────────────────────
 * vitest.config.ts — Frontend test runner configuration
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Configures Vitest for the frontend: the React plugin, the path aliases
 *   (mirrors vite.config.ts / tsconfig.json), a jsdom environment for component
 *   tests, and a setup file that registers @testing-library/jest-dom matchers.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · vitest/config (defineConfig) → typed config helper
 *     · @vitejs/plugin-react → JSX support under test
 *     · node:path, node:url → absolute alias targets
 *   Used by:
 *     · `vitest` CLI via `npm test` in app/frontend
 *
 * NOTES
 *   · Aliases MUST stay in sync with vite.config.ts and tsconfig.json.
 *   · environment 'jsdom' is required for React Testing Library renders.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, 'src');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': src,
      '@components': path.join(src, 'components'),
      '@ui': path.join(src, 'components', 'UI'),
      '@store': path.join(src, 'store'),
      '@pages': path.join(src, 'pages'),
      '@utils': path.join(src, 'utils'),
      '@hooks': path.join(src, 'hooks'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
});
