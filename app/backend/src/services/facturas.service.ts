import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@db/connection';
import { getAppConfig } from '@utils/config';
import { exportarLineasParaFactura } from '@services/presupuestos.service';
import { syncSeguimientoDesdeDocumento } from './seguimiento.service';

// ─── Tipos internos ───────────────────────────────────────────────────────────

export type EstadoFactura =
  | 'borrador'
  | 'cerrada'
  | 'entregada'
  | 'pendiente_pago'
  | 'pagada';

export interface LineaFactura {
  id: string;
  factura_id: string;
  descripcion: string;
  cantidad: number;
  unidad: string | null;
  precio_unitario: number;
  coste_unitario: number | null;
  margen_porcentaje: number | null;
  tipo: 'material' | 'manual' | 'concepto';
  es_libre: boolean;
  albaran_linea_id: string | null;
  orden: number;
}

export interface FacturaRow {
  id: string;
  trabajo_id: string;
  presupuesto_origen_id: string | null;
  numero: string | null;
  anio_numero: number | null;
  estado: EstadoFactura;
  fecha: string;
  fecha_cierre: string | null;
  notas: string | null;
  iva_porcentaje: number;
  borrador_data: string | null;
  borrador_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcularTotales(lineas: LineaFactura[], iva_porcentaje: number) {
  const subtotal = lineas.reduce(
    (acc, l) => acc + l.precio_unitario * l.cantidad,
    0
  );
  const iva = subtotal * (iva_porcentaje / 100);
  const total = subtotal + iva;
  return { subtotal, iva, iva_porcentaje, total };
}

async function siguienteNumeroFactura(anio: number): Promise<string> {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM facturas
       WHERE anio_numero = ? AND estado != 'borrador'`
    )
    .get(anio) as { cnt: number };
  const siguiente = row.cnt + 1;
  return String(siguiente).padStart(4, '0');
}

// ─── Listado ──────────────────────────────────────────────────────────────────

export async function listarFacturas(filtros: {
  trabajo_id?: string;
  estado?: EstadoFactura;
  cliente_id?: string;
}) {
  const db = getDb();
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (filtros.trabajo_id) {
    condiciones.push('f.trabajo_id = ?');
    params.push(filtros.trabajo_id);
  }
  if (filtros.estado) {
    condiciones.push('f.estado = ?');
    params.push(filtros.estado);
  }
  if (filtros.cliente_id) {
    condiciones.push('c.id = ?');
    params.push(filtros.cliente_id);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  return db
    .prepare(
      `SELECT
        f.id, f.trabajo_id, f.numero, f.estado, f.fecha, f.fecha_cierre,
        f.iva_porcentaje, f.created_at, f.updated_at,
        t.nombre AS trabajo_nombre,
        a.id AS agrupador_id, a.label AS agrupador_label,
        c.id AS cliente_id, c.nombre AS cliente_nombre,
        (SELECT COALESCE(SUM(fl.precio_unitario * fl.cantidad), 0)
         FROM factura_lineas fl WHERE fl.factura_id = f.id) AS subtotal,
        (SELECT COALESCE(SUM(fl.precio_unitario * fl.cantidad), 0)
         FROM factura_lineas fl WHERE fl.factura_id = f.id)
         * (1 + f.iva_porcentaje / 100.0) AS total
       FROM facturas f
       JOIN trabajos t ON t.id = f.trabajo_id
       JOIN agrupadores a ON a.id = t.agrupador_id
       JOIN clientes c ON c.id = a.cliente_id
       ${where}
       ORDER BY f.fecha DESC, f.created_at DESC`
    )
    .all(...params);
}

// ─── Detalle ──────────────────────────────────────────────────────────────────

export async function obtenerFactura(id: string) {
  const db = getDb();

  const factura = db
    .prepare(
      `SELECT
        f.*,
        t.nombre AS trabajo_nombre, t.margen_porcentaje AS trabajo_margen,
        a.id AS agrupador_id, a.label AS agrupador_label,
        c.id AS cliente_id, c.nombre AS cliente_nombre,
        c.empresa AS cliente_empresa, c.dni_cif AS cliente_dni_cif,
        c.telefono AS cliente_telefono, c.email AS cliente_email,
        c.direccion AS cliente_direccion
       FROM facturas f
       JOIN trabajos t ON t.id = f.trabajo_id
       JOIN agrupadores a ON a.id = t.agrupador_id
       JOIN clientes c ON c.id = a.cliente_id
       WHERE f.id = ?`
    )
    .get(id) as (FacturaRow & Record<string, unknown>) | undefined;

  if (!factura) return null;

  const lineas = db
    .prepare(
      `SELECT * FROM factura_lineas
       WHERE factura_id = ?
       ORDER BY orden ASC`
    )
    .all(id) as LineaFactura[];

  const versiones = db
    .prepare(
      `SELECT id, numero_version, pdf_path, created_at
       FROM factura_versiones
       WHERE factura_id = ?
       ORDER BY numero_version DESC`
    )
    .all(id);

  return {
    ...factura,
    lineas,
    versiones,
    totales: calcularTotales(lineas, factura.iva_porcentaje as number),
  };
}

// ─── Crear ────────────────────────────────────────────────────────────────────

export async function crearFactura(data: {
  trabajo_id: string;
  fecha?: string;
  notas?: string;
  presupuesto_origen_id?: string;
  lineas?: Omit<LineaFactura, 'id' | 'factura_id' | 'orden'>[];
}) {
  const db = getDb();
  const config = getAppConfig();
  const id = uuidv4();
  const fecha = data.fecha ?? new Date().toISOString().slice(0, 10);
  const iva = config.documentos?.iva_porcentaje ?? 21;

  db.prepare(
    `INSERT INTO facturas
     (id, trabajo_id, presupuesto_origen_id, estado, fecha, notas,
      iva_porcentaje, created_at, updated_at)
     VALUES (?, ?, ?, 'borrador', ?, ?, ?, datetime('now'), datetime('now'))`
  ).run(
    id, data.trabajo_id, data.presupuesto_origen_id ?? null,
    fecha, data.notas ?? null, iva
  );

  // Si viene de un presupuesto, importar sus líneas
  let lineas = data.lineas;
  if (!lineas?.length && data.presupuesto_origen_id) {
    lineas = await exportarLineasParaFactura(data.presupuesto_origen_id) as typeof lineas;
  }

  if (lineas?.length) {
    const stmt = db.prepare(
      `INSERT INTO factura_lineas
       (id, factura_id, descripcion, cantidad, unidad, precio_unitario,
        coste_unitario, margen_porcentaje, tipo, es_libre, albaran_linea_id, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    lineas.forEach((l, idx) => {
      stmt.run(
        uuidv4(), id, l.descripcion, l.cantidad, l.unidad ?? null,
        l.precio_unitario, l.coste_unitario ?? null,
        l.margen_porcentaje ?? null, l.tipo,
        l.es_libre ? 1 : 0, l.albaran_linea_id ?? null, idx
      );
    });
  }

  return obtenerFactura(id);
}

// ─── Guardar líneas ───────────────────────────────────────────────────────────

export async function guardarLineas(
  factura_id: string,
  lineas: Omit<LineaFactura, 'id' | 'factura_id' | 'orden'>[]
) {
  const db = getDb();

  db.prepare('DELETE FROM factura_lineas WHERE factura_id = ?').run(factura_id);

  const stmt = db.prepare(
    `INSERT INTO factura_lineas
     (id, factura_id, descripcion, cantidad, unidad, precio_unitario,
      coste_unitario, margen_porcentaje, tipo, es_libre, albaran_linea_id, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  lineas.forEach((l, idx) => {
    stmt.run(
      uuidv4(), factura_id, l.descripcion, l.cantidad, l.unidad ?? null,
      l.precio_unitario, l.coste_unitario ?? null,
      l.margen_porcentaje ?? null, l.tipo,
      l.es_libre ? 1 : 0, l.albaran_linea_id ?? null, idx
    );
  });

  db.prepare(
    `UPDATE facturas SET updated_at = datetime('now') WHERE id = ?`
  ).run(factura_id);
}

// ─── Autoguardado ─────────────────────────────────────────────────────────────

export async function guardarBorrador(id: string, data: unknown) {
  const db = getDb();
  db.prepare(
    `UPDATE facturas
     SET borrador_data = ?, borrador_updated_at = datetime('now')
     WHERE id = ?`
  ).run(JSON.stringify(data), id);
}

// ─── Cerrar factura ───────────────────────────────────────────────────────────

export interface ResultadoCierre {
  ok: boolean;
  factura?: Awaited<ReturnType<typeof obtenerFactura>>;
  error?: string;
}

export async function cerrarFactura(id: string): Promise<ResultadoCierre> {
  const db = getDb();
  const factura = await obtenerFactura(id);
  if (!factura) return { ok: false, error: 'Factura no encontrada' };
  if (factura.estado !== 'borrador') {
    return { ok: false, error: 'La factura no está en borrador' };
  }

  const anio = new Date().getFullYear();
  const numero = await siguienteNumeroFactura(anio);

  db.prepare(
    `UPDATE facturas
     SET estado = 'cerrada', numero = ?, anio_numero = ?,
         fecha_cierre = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`
  ).run(numero, anio, id);

  return { ok: true, factura: await obtenerFactura(id) };
}

// ─── Cambiar estado ───────────────────────────────────────────────────────────

export async function cambiarEstado(id: string, estado: EstadoFactura) {
  const db = getDb();

  // Reabrir como borrador: limpiar número si vuelve a borrador
  if (estado === 'borrador') {
    db.prepare(
      `UPDATE facturas
       SET estado = 'borrador', numero = NULL, anio_numero = NULL,
           fecha_cierre = NULL, updated_at = datetime('now')
       WHERE id = ?`
    ).run(id);
  } else {
    db.prepare(
      `UPDATE facturas SET estado = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(estado, id);

    if (id) {
      syncSeguimientoDesdeDocumento(id, 'factura', estado);
    }
  }


  return obtenerFactura(id);
}

// ─── Guardar versión permanente ───────────────────────────────────────────────

export async function guardarVersion(factura_id: string, pdf_path: string) {
  const db = getDb();
  const config = getAppConfig();
  const maxVersiones = config.documentos?.max_versiones ?? 10;

  const last = db
    .prepare(
      `SELECT MAX(numero_version) AS last FROM factura_versiones
       WHERE factura_id = ?`
    )
    .get(factura_id) as { last: number | null };
  const numero_version = (last.last ?? 0) + 1;

  db.prepare(
    `INSERT INTO factura_versiones
     (id, factura_id, numero_version, pdf_path, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`
  ).run(uuidv4(), factura_id, numero_version, pdf_path);

  // Purgar antiguas
  const versiones = db
    .prepare(
      `SELECT id FROM factura_versiones
       WHERE factura_id = ?
       ORDER BY numero_version ASC`
    )
    .all(factura_id) as { id: string }[];

  if (versiones.length > maxVersiones) {
    const aBorrar = versiones.slice(0, versiones.length - maxVersiones);
    const stmtDel = db.prepare('DELETE FROM factura_versiones WHERE id = ?');
    aBorrar.forEach(v => stmtDel.run(v.id));
  }

  return numero_version;
}

// ─── Eliminar ─────────────────────────────────────────────────────────────────

export async function eliminarFactura(id: string) {
  const db = getDb();
  db.prepare('DELETE FROM factura_lineas WHERE factura_id = ?').run(id);
  db.prepare('DELETE FROM factura_versiones WHERE factura_id = ?').run(id);
  db.prepare('DELETE FROM facturas WHERE id = ?').run(id);
}

// ─── Borrador sucio (para el launcher) ───────────────────────────────────────

export async function hayBorradorSucio(): Promise<boolean> {
  const db = getDb();

  const facturas = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM facturas
       WHERE borrador_updated_at IS NOT NULL
         AND borrador_updated_at > updated_at`
    )
    .get() as { cnt: number };

  const presupuestos = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM presupuestos
       WHERE borrador_updated_at IS NOT NULL
         AND borrador_updated_at > updated_at`
    )
    .get() as { cnt: number };

  return facturas.cnt > 0 || presupuestos.cnt > 0;
}