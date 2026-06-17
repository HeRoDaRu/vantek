/**
 * ──────────────────────────────────────────────────────────────────────────────
 * copy-templates.mjs — Copy PDF templates into dist at build
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Build helper that copies the HTML/CSS PDF templates from src/templates to
 *   dist/templates, since `tsc` only emits .ts files. Skips silently if the
 *   source folder is missing.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · node:fs/promises (cp, mkdir), node:fs (existsSync), node:path,
 *       node:url (fileURLToPath) → native-only file operations
 *   Used by:
 *     · the backend build script (after tsc) → provisions dist/templates so
 *       pdf.service.ts finds the templates in production
 *
 * EXPORTS
 *   · (none) → runs as a side-effecting build script
 *
 * INPUTS / OUTPUTS
 *   Input:  app/backend/src/templates/*
 *   Output: app/backend/dist/templates/* (created/overwritten)
 *
 * NOTES
 *   · Multiplatform (Windows portable + Docker), native Node APIs only.
 *   · In dev (tsx) this isn't used; pdf.service.ts resolves src/templates directly.
 * ──────────────────────────────────────────────────────────────────────────────
 */


import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(scriptDir, '..', 'src', 'templates');
const dest = path.join(scriptDir, '..', 'dist', 'templates');

if (!existsSync(src)) {
  console.warn('[copy-templates] No existe src/templates; nada que copiar.');
  process.exit(0);
}

await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });
console.log('[copy-templates] Plantillas copiadas a dist/templates');
