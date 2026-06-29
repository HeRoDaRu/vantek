/**
 * ──────────────────────────────────────────────────────────────────────────────
 * migrate.test.ts — Schema migrations reach v8 and are idempotent
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { describe, expect, it } from 'vitest';
import { db } from './helpers/db';
import { runMigrations } from '@db/migrate';

describe('runMigrations', () => {
  it('applied all migrations up to v8 during setup', () => {
    const max = (db().prepare('SELECT MAX(version) AS v FROM _migraciones').get() as { v: number }).v;
    expect(max).toBe(8);
  });

  it('is idempotent — running again applies nothing and does not throw', () => {
    const antes = (db().prepare('SELECT COUNT(*) AS n FROM _migraciones').get() as { n: number }).n;
    expect(() => runMigrations()).not.toThrow();
    const despues = (db().prepare('SELECT COUNT(*) AS n FROM _migraciones').get() as { n: number }).n;
    expect(despues).toBe(antes);
  });

  it('created the facturas.anio_numero column (v7)', () => {
    const cols = (db().prepare(`PRAGMA table_info(facturas)`).all() as { name: string }[]).map(c => c.name);
    expect(cols).toContain('anio_numero');
  });

  it('created the cliente_incidencias table (v8)', () => {
    const tabla = db()
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cliente_incidencias'`)
      .get() as { name: string } | undefined;
    expect(tabla?.name).toBe('cliente_incidencias');
  });
});
