/**
 * ──────────────────────────────────────────────────────────────────────────────
 * setup.ts — Backend test setup (throwaway install + migrations)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Runs once before each test file. Creates a unique temporary install root,
 *   points VANTEK_ROOT at it BEFORE any @utils/paths import resolves, seeds the
 *   config/ folder from the repo templates (so getAppConfig works), and applies
 *   all schema migrations to the fresh SQLite database.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · node:fs, node:os, node:path, node:url → temp dir + config seeding
 *     · ../src/db/migrate (dynamic) → runMigrations() on the fresh DB
 *   Used by:
 *     · vitest.config.ts (setupFiles) → every backend test file
 *
 * NOTES
 *   · VANTEK_ROOT must be set before paths.ts is first imported; the dynamic
 *     import of migrate.ts happens after that assignment.
 *   · Each test file gets its own temp root + DB (Vitest isolates module state),
 *     so files never share or clobber data.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoConfig = path.resolve(here, '../../../config');

// 1) Unique throwaway install root for this test file.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vantek-test-'));
process.env.VANTEK_ROOT = root;

// 2) Seed config/ from the repo templates so getAppConfig()/getProfileConfig() work.
const configDir = path.join(root, 'config');
fs.mkdirSync(configDir, { recursive: true });
fs.mkdirSync(path.join(root, 'data', 'pdfs'), { recursive: true });

const appTemplate = path.join(repoConfig, 'app.config.template.json');
const profileTemplate = path.join(repoConfig, 'profile.config.template.json');

fs.copyFileSync(appTemplate, path.join(configDir, 'app.config.json'));
fs.copyFileSync(appTemplate, path.join(configDir, 'app.config.template.json'));
fs.copyFileSync(profileTemplate, path.join(configDir, 'profile.config.json'));

// 3) Apply all migrations to the fresh DB (silence the migration logs).
const origLog = console.log;
console.log = () => {};
const { runMigrations } = await import('../src/db/migrate');
runMigrations();
console.log = origLog;
