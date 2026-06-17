/**
 * ──────────────────────────────────────────────────────────────────────────────
 * connection.ts — Conexión singleton a la base de datos SQLite
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Opens (and reuses) a single better-sqlite3 instance over vantek.db,
 *   creating the data directory if it does not exist and enabling the
 *   project's PRAGMA (WAL, foreign_keys, synchronous=NORMAL). It is the single
 *   source of the DB handle for the whole backend.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · better-sqlite3 (Database) → synchronous SQLite driver
 *     · path, fs (mkdirSync) → path and creation of the data directory
 *     · @utils/paths (DATA_DIR) → location of the DB file
 *   Used by:
 *     · All services and db/migrate.ts → obtain the handle via getDb()
 *
 * EXPORTS
 *   · getDb() → singleton Database instance (created on the first call)
 *   · closeDb() → closes the connection if it is open
 *
 * INPUTS / OUTPUTS
 *   Input:  none (path derived from DATA_DIR)
 *   Output: Database handle with WAL/foreign_keys enabled
 *
 * NOTES
 *   · Mandatory project PRAGMA: journal_mode = WAL and foreign_keys = ON.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import Database from 'better-sqlite3';
import path from 'path';
import { mkdirSync } from 'fs';
import { DATA_DIR } from '@utils/paths';

const DB_PATH = path.join(DATA_DIR, 'vantek.db');
mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
