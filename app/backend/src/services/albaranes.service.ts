import { getDb } from '@db/connection';
import { v4 as uuidv4 } from 'uuid';
import { Albaran, AlbaranListItem, AlbaranLinea } from '../types';

export const albanesService = {

  findAll(filtros?: {
    estado?: 'sin_asignar' | 'asignado';
    proveedor?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }): AlbaranListItem[] {
    const db = getDb();
    const params: unknown[] = [];

    let where = 'WHERE 1=1';

    if (filtros?.proveedor) {
      where += ' AND al.proveedor_nombre LIKE ?';
      params.push(`%${filtros.proveedor}%`);
    }
    if (filtros?.fecha_desde) {
      where += ' AND al.fecha >= ?';
      params.push(filtros.fecha_desde);
    }
    if (filtros?.fecha_hasta) {
      where += ' AND al.fecha <= ?';
      params.push(filtros.fecha_hasta);
    }

    const rows = db.prepare(`
      SELECT
        al.id, al.proveedor_nombre, al.numero, al.fecha, al.created_at,
        t.id as trabajo_id, t.nombre as trabajo_nombre,
        COUNT(DISTINCT alinea.id) as lineas_count,
        COUNT(DISTINCT alt.id) as lineas_asignadas
      FROM albaranes al
      LEFT JOIN albaran_lineas alinea ON alinea.albaran_id = al.id
      LEFT JOIN albaran_linea_trabajo alt ON alt.albaran_linea_id = alinea.id
      LEFT JOIN trabajos t ON t.id = alt.trabajo_id
      ${where}
      GROUP BY al.id, t.id
      ORDER BY al.fecha DESC
    `).all(...params) as any[];

    const result = rows.map(r => ({
      ...r,
      estado: r.lineas_asignadas === 0
        ? 'sin_asignar'
        : r.lineas_asignadas < r.lineas_count
          ? 'parcial'
          : 'asignado'
    }));

    if (!filtros?.estado) return result;
    if (filtros.estado === 'sin_asignar') return result.filter(r => r.estado === 'sin_asignar');
    if (filtros.estado === 'asignado') return result.filter(r => r.estado !== 'sin_asignar');
    return result;
  },

  findById(id: string): Albaran | null {
    const db = getDb();
    const albaran = db.prepare(`SELECT * FROM albaranes WHERE id = ?`).get(id) as Albaran | undefined;
    if (!albaran) return null;

    const lineas = db.prepare(`
      SELECT
        alinea.*,
        GROUP_CONCAT(alt.trabajo_id) as trabajo_ids,
        GROUP_CONCAT(t.nombre) as trabajo_nombres
      FROM albaran_lineas alinea
      LEFT JOIN albaran_linea_trabajo alt ON alt.albaran_linea_id = alinea.id
      LEFT JOIN trabajos t ON t.id = alt.trabajo_id
      WHERE alinea.albaran_id = ?
      GROUP BY alinea.id
      ORDER BY alinea.orden ASC
    `).all(id) as any[];

    albaran.lineas = lineas.map(l => ({
      ...l,
      trabajos_asignados: l.trabajo_ids
        ? l.trabajo_ids.split(',').map((tid: string, i: number) => ({
            trabajo_id: tid,
            trabajo_nombre: l.trabajo_nombres?.split(',')[i] ?? ''
          }))
        : []
    }));

    return albaran;
  },

  // Albaranes asignados a un trabajo (para el selector al añadir ítems a factura)
  findByTrabajo(trabajoId: string): Albaran[] {
    const db = getDb();
    const albaranes = db.prepare(`
      SELECT DISTINCT al.*
      FROM albaranes al
      JOIN albaran_lineas alinea ON alinea.albaran_id = al.id
      JOIN albaran_linea_trabajo alt ON alt.albaran_linea_id = alinea.id
      WHERE alt.trabajo_id = ?
      ORDER BY al.fecha DESC
    `).all(trabajoId) as Albaran[];

    for (const al of albaranes) {
      al.lineas = db.prepare(`
        SELECT alinea.*
        FROM albaran_lineas alinea
        JOIN albaran_linea_trabajo alt ON alt.albaran_linea_id = alinea.id
        WHERE alinea.albaran_id = ? AND alt.trabajo_id = ?
        ORDER BY alinea.orden ASC
      `).all(al.id, trabajoId) as AlbaranLinea[];
    }

    return albaranes;
  },

  create(data: {
    proveedor_nombre?: string;
    numero?: string;
    fecha: string;
    notas?: string;
    lineas: {
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
      unidad?: string;
    }[];
  }): Albaran {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    const insert = db.transaction(() => {
      db.prepare(`
        INSERT INTO albaranes (id, proveedor_nombre, numero, fecha, notas, ocr_procesado, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `).run(id, data.proveedor_nombre ?? null, data.numero ?? null,
             data.fecha, data.notas ?? null, now, now);

      for (const [i, linea] of data.lineas.entries()) {
        db.prepare(`
          INSERT INTO albaran_lineas (id, albaran_id, descripcion, cantidad, precio_unitario, unidad, orden, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), id, linea.descripcion, linea.cantidad,
               linea.precio_unitario, linea.unidad ?? null, i, now);
      }
    });

    insert();
    return this.findById(id)!;
  },

  // Asignar líneas a un trabajo (por defecto todas si no se especifican)
  asignarLineas(albaranId: string, trabajoId: string, lineaIds?: string[]): void {
    const db = getDb();

    const lineas = lineaIds
      ? db.prepare(
          `SELECT id FROM albaran_lineas WHERE albaran_id = ? AND id IN (${lineaIds.map(() => '?').join(',')})`
        ).all(albaranId, ...lineaIds) as { id: string }[]
      : db.prepare(`SELECT id FROM albaran_lineas WHERE albaran_id = ?`)
          .all(albaranId) as { id: string }[];

    const asignar = db.transaction(() => {
      for (const linea of lineas) {
        db.prepare(`
          INSERT OR IGNORE INTO albaran_linea_trabajo (id, albaran_linea_id, trabajo_id)
          VALUES (?, ?, ?)
        `).run(uuidv4(), linea.id, trabajoId);
      }
    });

    asignar();
  },

  // Mover una línea concreta de un trabajo a otro
  moverLinea(lineaId: string, desdeTrabajo: string, hastaTrabajo: string): void {
    const db = getDb();
    db.prepare(`
      UPDATE albaran_linea_trabajo SET trabajo_id = ?
      WHERE albaran_linea_id = ? AND trabajo_id = ?
    `).run(hastaTrabajo, lineaId, desdeTrabajo);
  },

  // Desasignar líneas de un trabajo
  desasignarLineas(lineaIds: string[], trabajoId: string): void {
    const db = getDb();
    const desasignar = db.transaction(() => {
      for (const lineaId of lineaIds) {
        db.prepare(`
          DELETE FROM albaran_linea_trabajo WHERE albaran_linea_id = ? AND trabajo_id = ?
        `).run(lineaId, trabajoId);
      }
    });
    desasignar();
  }
};