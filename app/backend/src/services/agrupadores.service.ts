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