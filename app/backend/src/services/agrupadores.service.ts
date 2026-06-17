/**
 * ──────────────────────────────────────────────────────────────────────────────
 * agrupadores.service.ts — CRUD de agrupadores (direcciones/matrículas)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Business logic for agrupadores: the intermediate level of the hierarchy
 *   Cliente → Agrupador → Trabajo. An agrupador represents a dirección
 *   (reformas profile) or matrícula (taller profile). Implements CRUD with
 *   logical deletion (activo = 0), never physical.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @db/connection (getDb) → better-sqlite3 handle with WAL/foreign_keys
 *     · uuid (v4) → generates the IDs of new agrupadores
 *     · ../types (Agrupador) → row type of the agrupadores table
 *   Used by:
 *     · routes/clientes.router.ts → exposes the agrupadores nested under the cliente
 *     · clientes.service.ts → attaches agrupadores to the cliente record
 *
 * EXPORTS
 *   · agrupadoresService.findByCliente(clienteId) → active agrupadores of the cliente
 *   · agrupadoresService.findById(id) → an active agrupador or null
 *   · agrupadoresService.create({cliente_id,label,descripcion?}) → created agrupador
 *   · agrupadoresService.update(id, {label?,descripcion?}) → updated agrupador or null
 *   · agrupadoresService.delete(id) → logical deletion (activo = 0)
 *
 * INPUTS / OUTPUTS
 *   Input:  agrupador ids/data; state of the agrupadores table
 *   Output: Agrupador rows; INSERT/UPDATE side effects in SQLite
 *
 * NOTES
 *   · Logical deletion is mandatory (principle 5): mark activo = 0, never DELETE.
 *   · update uses COALESCE so it does not overwrite fields that were not sent.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { getDb } from '@db/connection';
import { v4 as uuidv4 } from 'uuid';
import { Agrupador } from '../types';

export const agrupadoresService = {

  findByCliente(clienteId: string): Agrupador[] {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM agrupadores
      WHERE cliente_id = ? AND activo = 1
      ORDER BY created_at DESC
    `).all(clienteId) as Agrupador[];
  },

  findById(id: string): Agrupador | null {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM agrupadores WHERE id = ? AND activo = 1
    `).get(id) as Agrupador | null;
  },

  create(data: { cliente_id: string; label: string; descripcion?: string }): Agrupador {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO agrupadores (id, cliente_id, label, descripcion, activo, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(id, data.cliente_id, data.label, data.descripcion ?? null, now, now);

    return this.findById(id)!;
  },

  update(id: string, data: { label?: string; descripcion?: string }): Agrupador | null {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE agrupadores SET
        label = COALESCE(?, label),
        descripcion = COALESCE(?, descripcion),
        updated_at = ?
      WHERE id = ?
    `).run(data.label ?? null, data.descripcion ?? null, now, id);

    return this.findById(id);
  },

  delete(id: string): void {
    const db = getDb();
    db.prepare(`UPDATE agrupadores SET activo = 0, updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), id);
  }
};