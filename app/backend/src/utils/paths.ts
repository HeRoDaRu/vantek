/**
 * ──────────────────────────────────────────────────────────────────────────────
 * paths.ts — Runtime base-path resolver
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Resolves the install root (APP_ROOT) and derives the config, data and PDF
 *   directory paths from it, so both deployments (Windows portable + Docker)
 *   anchor to the same base regardless of dist depth.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · path → join base paths
 *   Used by:
 *     · index.ts, config.ts, routers & services → CONFIG_DIR/DATA_DIR/PDFS_DIR
 *
 * EXPORTS
 *   · APP_ROOT  → install root (VANTEK_ROOT env or process.cwd())
 *   · CONFIG_DIR → <APP_ROOT>/config
 *   · DATA_DIR   → <APP_ROOT>/data
 *   · PDFS_DIR   → <APP_ROOT>/data/pdfs
 *
 * INPUTS / OUTPUTS
 *   Input:  env VANTEK_ROOT (optional)
 *   Output: absolute path constants
 *
 * NOTES
 *   · Windows launcher sets cwd + VANTEK_ROOT to the install root; Docker runs
 *     with WORKDIR /app so process.cwd() === '/app'.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import path from 'path';

export const APP_ROOT = process.env.VANTEK_ROOT || process.cwd();

export const CONFIG_DIR = path.join(APP_ROOT, 'config');
export const DATA_DIR = path.join(APP_ROOT, 'data');
export const PDFS_DIR = path.join(DATA_DIR, 'pdfs');
