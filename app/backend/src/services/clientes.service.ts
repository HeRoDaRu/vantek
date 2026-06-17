/**
 * ──────────────────────────────────────────────────────────────────────────────
 * clientes.service.ts — CRUD de clientes y ficha anidada cliente→obra
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Business logic for clientes (root of the hierarchy). Lists, searches and
 *   composes the full record with its nested agrupadores and trabajos, and
 *   includes the state of the linked seguimiento for the obra badge.
 *   Deletion is always logical (activo = 0).
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @db/connection (getDb) → SQLite handle
 *     · uuid (v4) → IDs of new clientes
 *     · ../types → Cliente, ClienteConAgrupadores, Agrupador, AgrupadorConTrabajos, TrabajoBrief
 *   Used by:
 *     · routes/clientes.router.ts → exposes listing, record, search and CRUD
 *
 * EXPORTS
 *   · clientesService.findAll(search?) → active clientes + their agrupadores
 *   · clientesService.findById(id) → record with nested agrupadores and trabajos
 *   · clientesService.search(q) → global search by cliente/empresa/dni/dirección
 *   · clientesService.create(data) → created cliente (full record)
 *   · clientesService.update(id, data) → updated cliente or null
 *   · clientesService.delete(id) → logical deletion (activo = 0)
 *
 * INPUTS / OUTPUTS
 *   Input:  search terms, cliente ids and data; state of the DB
 *   Output: clientes (with nested entities); INSERT/UPDATE in SQLite
 *
 * NOTES
 *   · findById does a LEFT JOIN to seguimiento to return estado_seguimiento per
 *     trabajo, so the cliente badge matches the one in Seguimiento.
 *   · The obra address lives in agrupadores.label; clientes has no direccion field.
 *   · Logical deletion is mandatory (principle 5): historical documents are preserved.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { getDb } from '@db/connection';
import { v4 as uuidv4 } from 'uuid';
import { Cliente, ClienteConAgrupadores, Agrupador, AgrupadorConTrabajos, TrabajoBrief } from '../types';

export const clientesService = {

  findAll(search?: string): (Cliente & { agrupadores: Agrupador[] })[] {
    const db = getDb();
    let clientes: Cliente[];
    if (search) {
      const term = `%${search}%`;
      clientes = db.prepare(`
        SELECT * FROM clientes
        WHERE activo = 1
          AND (nombre LIKE ? OR empresa LIKE ? OR dni_cif LIKE ?)
        ORDER BY nombre ASC
      `).all(term, term, term) as Cliente[];
    } else {
      clientes = db.prepare(`
        SELECT * FROM clientes WHERE activo = 1 ORDER BY nombre ASC
      `).all() as Cliente[];
    }

    if (clientes.length === 0) return [];

    // Adjuntar las direcciones (labels de agrupadores) para distinguir
    // clientes homónimos en el listado.
    const ids = clientes.map(c => c.id);
    const placeholders = ids.map(() => '?').join(', ');
    const agrupadores = db.prepare(`
      SELECT * FROM agrupadores
      WHERE activo = 1 AND cliente_id IN (${placeholders})
      ORDER BY created_at DESC
    `).all(...ids) as Agrupador[];

    const porCliente = new Map<string, Agrupador[]>();
    for (const a of agrupadores) {
      const lista = porCliente.get(a.cliente_id) ?? [];
      lista.push(a);
      porCliente.set(a.cliente_id, lista);
    }

    return clientes.map(c => ({ ...c, agrupadores: porCliente.get(c.id) ?? [] }));
  },

  findById(id: string): ClienteConAgrupadores | null {
    const db = getDb();
    const cliente = db.prepare(`
      SELECT * FROM clientes WHERE id = ? AND activo = 1
    `).get(id) as Cliente | undefined;

    if (!cliente) return null;

    const agrupadores = db.prepare(`
      SELECT * FROM agrupadores WHERE cliente_id = ? AND activo = 1 ORDER BY created_at DESC
    `).all(id) as AgrupadorConTrabajos[];

    for (const agrupador of agrupadores) {
      agrupador.trabajos = db.prepare(`
        SELECT
          t.id, t.nombre, t.estado, t.created_at,
          s.estado AS estado_seguimiento
        FROM trabajos t
        LEFT JOIN seguimiento s ON s.trabajo_id = t.id
        WHERE t.agrupador_id = ? ORDER BY t.created_at DESC
      `).all(agrupador.id) as TrabajoBrief[];
    }

    return { ...cliente, agrupadores };
  },

  // Búsqueda global: cliente + agrupador + dni/cif
  search(q: string): { id: string; nombre: string; empresa?: string; agrupador_label?: string; agrupador_id?: string }[] {
    const db = getDb();
    const term = `%${q}%`;

    const porCliente = db.prepare(`
      SELECT c.id, c.nombre, c.empresa, NULL as agrupador_label, NULL as agrupador_id
      FROM clientes c
      WHERE c.activo = 1 AND (c.nombre LIKE ? OR c.empresa LIKE ? OR c.dni_cif LIKE ?)
    `).all(term, term, term) as any[];

    const porAgrupador = db.prepare(`
      SELECT c.id, c.nombre, c.empresa, a.label as agrupador_label, a.id as agrupador_id
      FROM clientes c
      JOIN agrupadores a ON a.cliente_id = c.id
      WHERE c.activo = 1 AND a.activo = 1 AND a.label LIKE ?
    `).all(term) as any[];

    const seen = new Set<string>();
    const results = [];
    for (const r of [...porCliente, ...porAgrupador]) {
      const key = r.agrupador_id ? `${r.id}-${r.agrupador_id}` : r.id;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(r);
      }
    }
    return results;
  },

  create(data: {
    nombre: string;
    empresa?: string;
    dni_cif?: string;
    telefono?: string;
    email?: string;
    notas?: string;
  }): ClienteConAgrupadores {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO clientes (id, nombre, empresa, dni_cif, telefono, email, notas, activo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, data.nombre, data.empresa ?? null, data.dni_cif ?? null,
           data.telefono ?? null, data.email ?? null, data.notas ?? null, now, now);

    return this.findById(id)!;
  },

  update(id: string, data: Partial<Cliente>): ClienteConAgrupadores | null {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE clientes SET
        nombre = COALESCE(?, nombre),
        empresa = COALESCE(?, empresa),
        dni_cif = COALESCE(?, dni_cif),
        telefono = COALESCE(?, telefono),
        email = COALESCE(?, email),
        notas = COALESCE(?, notas),
        updated_at = ?
      WHERE id = ?
    `).run(
      data.nombre ?? null, data.empresa ?? null, data.dni_cif ?? null,
      data.telefono ?? null, data.email ?? null, data.notas ?? null,
      now, id
    );

    return this.findById(id);
  },

  delete(id: string): void {
    const db = getDb();
    db.prepare(`UPDATE clientes SET activo = 0, updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), id);
  }
};