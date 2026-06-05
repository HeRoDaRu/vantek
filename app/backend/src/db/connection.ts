import Database from 'better-sqlite3';
import path from 'path';
import { mkdirSync } from 'fs';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'vantek.db');
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
