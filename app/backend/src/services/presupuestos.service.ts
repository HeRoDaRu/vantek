import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@db/connection';
import { getAppConfig } from '@utils/config';
import { syncSeguimientoDesdeDocumento } from './seguimiento.service';

// ─── Tipos internos ───────────────────────────────────────────────────────────

export type EstadoPresupuesto =
  | 'borrador'
  | 'enviado'
  | 'aceptado'
  | 'rechazado'
  | 'caducado';

export interface LineaPresupuesto {
  id: string;
  presupuesto_id: string;
  descripcion: string;
  cantidad: number;
  unidad: string | null;
  precio_unitario: number;
  coste_unitario: number | null;
  margen_porcentaje: number | null;
  tipo: 'material' | 'manual' | 'concepto';
  orden: number;
}

export interface PresupuestoRow {
  id: string;
  trabajo_id: string;
  numero: string | null;
  estado: EstadoPresupuesto;
  fecha: string;
  notas: string | null;
  iva_porcentaje: number;
  borrador_data: string | null;
  borrador_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcularTotales(lineas: LineaPresupuesto[]) {
  const subtotal = lineas.reduce(
    (acc, l) => acc + l.precio_unitario * l.cantidad,
    0
  );
  // Los presupuestos no llevan IVA en el total (según spec)
  return { subtotal, total: subtotal };
}

// ─── Listado ──────────────────────────────────────────────────────────────────

export async function listarPresupuestos(filtros: {
  trabajo_id?: string;
  estado?: EstadoPresupuesto;
  cliente_id?: string;
}) {
  const db = getDb();
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (filtros.trabajo_id) {
    condiciones.push('p.trabajo_id = ?');
    params.push(filtros.trabajo_id);
  }
  if (filtros.estado) {
    condiciones.push('p.estado = ?');
    params.push(filtros.estado);
  }
  if (filtros.cliente_id) {
    condiciones.push('c.id = ?');
    params.push(filtros.cliente_id);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const rows = db
    .prepare(
      `SELECT
        p.id, p.trabajo_id, p.numero, p.estado, p.fecha, p.notas,
        p.iva_porcentaje, p.created_at, p.updated_at,
        t.nombre AS trabajo_nombre,
        a.id AS agrupador_id, a.label AS agrupador_label,
        c.id AS cliente_id, c.nombre AS cliente_nombre,
        (SELECT COALESCE(SUM(pl.precio_unitario * pl.cantidad), 0)
         FROM presupuesto_lineas pl WHERE pl.presupuesto_id = p.id) AS importe
       FROM presupuestos p
       JOIN trabajos t ON t.id = p.trabajo_id
       JOIN agrupadores a ON a.id = t.agrupador_id
       JOIN clientes c ON c.id = a.cliente_id
       ${where}
       ORDER BY p.fecha DESC, p.created_at DESC`
    )
    .all(...params);

  return rows;
}

// ─── Detalle ──────────────────────────────────────────────────────────────────

export async function obtenerPresupuesto(id: string) {
  const db = getDb();

  const presupuesto = db
    .prepare(
      `SELECT
        p.*,
        t.nombre AS trabajo_nombre, t.margen_porcentaje AS trabajo_margen,
        a.id AS agrupador_id, a.label AS agrupador_label,
        c.id AS cliente_id, c.nombre AS cliente_nombre,
        c.empresa AS cliente_empresa, c.dni_cif AS cliente_dni_cif,
        c.direccion AS cliente_direccion
       FROM presupuestos p
       JOIN trabajos t ON t.id = p.trabajo_id
       JOIN agrupadores a ON a.id = t.agrupador_id
       JOIN clientes c ON c.id = a.cliente_id
       WHERE p.id = ?`
    )
    .get(id) as (PresupuestoRow & Record<string, unknown>) | undefined;

  if (!presupuesto) return null;

  const lineas = db
    .prepare(
      `SELECT * FROM presupuesto_lineas
       WHERE presupuesto_id = ?
       ORDER BY orden ASC`
    )
    .all(id) as LineaPresupuesto[];

  const versiones = db
    .prepare(
      `SELECT id, numero_version, pdf_path, created_at
       FROM presupuesto_versiones
       WHERE presupuesto_id = ?
       ORDER BY numero_version DESC`
    )
    .all(id);

  return {
    ...presupuesto,
    lineas,
    versiones,
    totales: calcularTotales(lineas),
  };
}

// ─── Crear ────────────────────────────────────────────────────────────────────

export async function crearPresupuesto(data: {
  trabajo_id: string;
  fecha?: string;
  notas?: string;
  lineas?: Omit<LineaPresupuesto, 'id' | 'presupuesto_id' | 'orden'>[];
}) {
  const db = getDb();
  const config = getAppConfig();
  const id = uuidv4();
  const fecha = data.fecha ?? new Date().toISOString().slice(0, 10);
  const iva = config.documentos?.iva_porcentaje ?? 21;

  db.prepare(
    `INSERT INTO presupuestos
     (id, trabajo_id, estado, fecha, notas, iva_porcentaje, created_at, updated_at)
     VALUES (?, ?, 'borrador', ?, ?, ?, datetime('now'), datetime('now'))`
  ).run(id, data.trabajo_id, fecha, data.notas ?? null, iva);

  if (data.lineas?.length) {
    const stmtLinea = db.prepare(
      `INSERT INTO presupuesto_lineas
       (id, presupuesto_id, descripcion, cantidad, unidad,
        precio_unitario, coste_unitario, margen_porcentaje, tipo, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    data.lineas.forEach((l, idx) => {
      stmtLinea.run(
        uuidv4(), id, l.descripcion, l.cantidad, l.unidad ?? null,
        l.precio_unitario, l.coste_unitario ?? null,
        l.margen_porcentaje ?? null, l.tipo, idx
      );
    });
  }

  return obtenerPresupuesto(id);
}

// ─── Actualizar cabecera ──────────────────────────────────────────────────────

export async function actualizarPresupuesto(
  id: string,
  data: { notas?: string; fecha?: string }
) {
  const db = getDb();
  const sets: string[] = [];
  const params: unknown[] = [];

  if (data.notas !== undefined) { sets.push('notas = ?'); params.push(data.notas); }
  if (data.fecha !== undefined) { sets.push('fecha = ?'); params.push(data.fecha); }

  if (!sets.length) return obtenerPresupuesto(id);

  sets.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE presupuestos SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return obtenerPresupuesto(id);
}

// ─── Reemplazar líneas completas (guardar explícito) ─────────────────────────

export async function guardarLineas(
  presupuesto_id: string,
  lineas: Omit<LineaPresupuesto, 'id' | 'presupuesto_id' | 'orden'>[]
) {
  const db = getDb();

  db.prepare('DELETE FROM presupuesto_lineas WHERE presupuesto_id = ?').run(
    presupuesto_id
  );

  const stmt = db.prepare(
    `INSERT INTO presupuesto_lineas
     (id, presupuesto_id, descripcion, cantidad, unidad,
      precio_unitario, coste_unitario, margen_porcentaje, tipo, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  lineas.forEach((l, idx) => {
    stmt.run(
      uuidv4(), presupuesto_id, l.descripcion, l.cantidad, l.unidad ?? null,
      l.precio_unitario, l.coste_unitario ?? null,
      l.margen_porcentaje ?? null, l.tipo, idx
    );
  });

  db.prepare(
    `UPDATE presupuestos SET updated_at = datetime('now') WHERE id = ?`
  ).run(presupuesto_id);
}

// ─── Autoguardado de borrador ─────────────────────────────────────────────────

export async function guardarBorrador(
  id: string,
  data: unknown
) {
  const db = getDb();
  db.prepare(
    `UPDATE presupuestos
     SET borrador_data = ?, borrador_updated_at = datetime('now')
     WHERE id = ?`
  ).run(JSON.stringify(data), id);
}

// ─── Cambio de estado ─────────────────────────────────────────────────────────

export async function cambiarEstado(
  id: string,
  estado: EstadoPresupuesto
) {
  const db = getDb();

  // Si pasa a aceptado, intentar crear trabajo vinculado (lógica básica, Fase 5 la completa)
  db.prepare(
    `UPDATE presupuestos
     SET estado = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(estado, id);

  if (id) {
    syncSeguimientoDesdeDocumento(id, 'presupuesto', estado);
  }
  return obtenerPresupuesto(id);
}

// ─── Guardar versión permanente ───────────────────────────────────────────────

export async function guardarVersion(
  presupuesto_id: string,
  pdf_path: string
) {
  const db = getDb();
  const config = getAppConfig();
  const maxVersiones = config.documentos?.max_versiones ?? 10;

  // Obtener número siguiente
  const last = db
    .prepare(
      `SELECT MAX(numero_version) AS last FROM presupuesto_versiones
       WHERE presupuesto_id = ?`
    )
    .get(presupuesto_id) as { last: number | null };
  const numero_version = (last.last ?? 0) + 1;

  db.prepare(
    `INSERT INTO presupuesto_versiones
     (id, presupuesto_id, numero_version, pdf_path, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`
  ).run(uuidv4(), presupuesto_id, numero_version, pdf_path);

  // Purgar versiones antiguas si se supera el límite
  const versiones = db
    .prepare(
      `SELECT id FROM presupuesto_versiones
       WHERE presupuesto_id = ?
       ORDER BY numero_version ASC`
    )
    .all(presupuesto_id) as { id: string }[];

  if (versiones.length > maxVersiones) {
    const aBorrar = versiones.slice(0, versiones.length - maxVersiones);
    const stmtDel = db.prepare('DELETE FROM presupuesto_versiones WHERE id = ?');
    aBorrar.forEach(v => stmtDel.run(v.id));
  }

  return numero_version;
}

// ─── Eliminar presupuesto ─────────────────────────────────────────────────────

export async function eliminarPresupuesto(id: string) {
  const db = getDb();
  db.prepare('DELETE FROM presupuesto_lineas WHERE presupuesto_id = ?').run(id);
  db.prepare('DELETE FROM presupuesto_versiones WHERE presupuesto_id = ?').run(id);
  db.prepare('DELETE FROM presupuestos WHERE id = ?').run(id);
}

// ─── Importar líneas desde presupuesto (para crear factura) ──────────────────

export async function exportarLineasParaFactura(presupuesto_id: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT descripcion, cantidad, unidad, precio_unitario,
              coste_unitario, margen_porcentaje, tipo
       FROM presupuesto_lineas
       WHERE presupuesto_id = ?
       ORDER BY orden ASC`
    )
    .all(presupuesto_id) as Omit
  LineaPresupuesto,
    'id' | 'presupuesto_id' | 'orden'
    > [];
}