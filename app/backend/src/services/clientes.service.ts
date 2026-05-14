import { getDb } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';
import { Cliente, ClienteConAgrupadores, AgrupadorConTrabajos, TrabajoBrief } from '../types';

export const clientesService = {

  findAll(search?: string): Cliente[] {
    const db = getDb();
    if (search) {
      const term = `%${search}%`;
      return db.prepare(`
        SELECT * FROM clientes
        WHERE activo = 1
          AND (nombre LIKE ? OR empresa LIKE ? OR dni_cif LIKE ?)
        ORDER BY nombre ASC
      `).all(term, term, term) as Cliente[];
    }
    return db.prepare(`
      SELECT * FROM clientes WHERE activo = 1 ORDER BY nombre ASC
    `).all() as Cliente[];
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
        SELECT id, nombre, estado, created_at FROM trabajos
        WHERE agrupador_id = ? ORDER BY created_at DESC
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