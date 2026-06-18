/**
 * ──────────────────────────────────────────────────────────────────────────────
 * setup.ts — Frontend test setup (jest-dom matchers + cleanup)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Registers the @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 *   and unmounts React trees after each test to keep the jsdom DOM clean.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @testing-library/jest-dom/vitest → custom DOM matchers
 *     · @testing-library/react (cleanup), vitest (afterEach)
 *   Used by:
 *     · vitest.config.ts (setupFiles) → every frontend test file
 * ──────────────────────────────────────────────────────────────────────────────
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
