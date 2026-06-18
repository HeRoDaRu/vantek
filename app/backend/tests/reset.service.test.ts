/**
 * ──────────────────────────────────────────────────────────────────────────────
 * reset.service.test.ts — Fresh-start wipe keeps schema/usuarios, clears data
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { limpiarBd, db, crearCliente } from './helpers/db';
import { resetDatos } from '@services/reset.service';

beforeEach(() => limpiarBd());

describe('resetDatos', () => {
  it('wipes business tables but preserves usuarios and the schema version', () => {
    // Seed business data + an infrastructure user.
    crearCliente({ nombre: 'A' });
    crearCliente({ nombre: 'B' });
    db().prepare(`
      INSERT INTO usuarios (id, nombre, email, password_hash, rol)
      VALUES (?, 'Admin', 'a@a.com', 'x', 'admin')
    `).run(uuidv4());

    const versionAntes = (db().prepare('SELECT MAX(version) AS v FROM _migraciones').get() as { v: number }).v;

    resetDatos();

    const clientes = (db().prepare('SELECT COUNT(*) AS n FROM clientes').get() as { n: number }).n;
    const usuarios = (db().prepare('SELECT COUNT(*) AS n FROM usuarios').get() as { n: number }).n;
    const versionDespues = (db().prepare('SELECT MAX(version) AS v FROM _migraciones').get() as { v: number }).v;

    expect(clientes).toBe(0);
    expect(usuarios).toBe(1);
    expect(versionDespues).toBe(versionAntes);
  });
});
