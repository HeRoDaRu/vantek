import { getDb } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';
import { getAppConfig } from '../utils/config';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type EstadoSeguimiento =
  | 'nuevo'
  | 'contactado'
  | 'visita_agendada'
  | 'pendiente_presupuesto'
  | 'a_la_espera'
  | 'en_curso'
  | 'pendiente_facturar'
  | 'entregada'
  | 'pagada'
  | 'completado'
  | 'cancelado';

export interface Seguimiento {
  id: string;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  dni_cif: string | null;
  peticion: string | null;
  accion_peticion?: string | null;
  estado: EstadoSeguimiento;
  trabajo_id: string | null;
  fecha_visita: string | null;
  notas: string | null;
  // Taller
  matricula: string | null;
  marca_modelo: string | null;
  fecha_entrada: string | null;
  fecha_salida_estimada: string | null;
  descripcion_problema: string | null;
  firma_entrada: string | null;
  firma_salida: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  // JOINs
  trabajo_nombre?: string;
  agrupador_label?: string;
  cliente_nombre?: string;
}

export interface CrearSeguimientoDto {
  nombre: string;
  telefono?: string;
  direccion?: string;
  dni_cif?: string;
  peticion?: string;
  accion_peticion?: string;
  notas?: string;
  // Taller
  matricula?: string;
  marca_modelo?: string;
  fecha_entrada?: string;
  fecha_salida_estimada?: string;
  descripcion_problema?: string;
}

export interface ActualizarSeguimientoDto extends Partial<CrearSeguimientoDto> {
  fecha_visita?: string;
  firma_entrada?: string;
  firma_salida?: string;
}

// Estados desde los que aún se puede cancelar: hasta que el presupuesto se
// acepta (en_curso). A partir de en_curso la obra ya está iniciada.
const ESTADOS_CANCELABLES: EstadoSeguimiento[] = [
  'nuevo', 'contactado', 'visita_agendada', 'pendiente_presupuesto', 'a_la_espera',
];

// ─── Query base con JOINs ─────────────────────────────────────────────────────

const SELECT_CON_JOINS = `
  SELECT
    s.*,
    s.accion_peticion AS peticion,
    t.nombre AS trabajo_nombre,
    a.label  AS agrupador_label,
    c.nombre AS cliente_nombre
  FROM seguimiento s
  LEFT JOIN trabajos    t ON s.trabajo_id   = t.id
  LEFT JOIN agrupadores a ON t.agrupador_id = a.id
  LEFT JOIN clientes    c ON a.cliente_id   = c.id
`;

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function listar(filtros?: { estado?: EstadoSeguimiento }): Seguimiento[] {
  const db = getDb();
  if (filtros?.estado) {
    return db
      .prepare(`${SELECT_CON_JOINS} WHERE s.estado = ? ORDER BY s.created_at DESC`)
      .all(filtros.estado) as Seguimiento[];
  }
  return db
    .prepare(`${SELECT_CON_JOINS} ORDER BY s.created_at DESC`)
    .all() as Seguimiento[];
}

export function obtener(id: string): Seguimiento | null {
  const db = getDb();
  return db
    .prepare(`${SELECT_CON_JOINS} WHERE s.id = ?`)
    .get(id) as Seguimiento | null;
}

export function crear(data: CrearSeguimientoDto): Seguimiento {
  const db = getDb();
  const id = uuidv4();
  const accionPeticion = data.accion_peticion ?? data.peticion ?? null;

  db.prepare(`
    INSERT INTO seguimiento (
      id, nombre, telefono, direccion, dni_cif, accion_peticion, estado,
      matricula, marca_modelo, fecha_entrada, fecha_salida_estimada, descripcion_problema,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, 'nuevo',
      ?, ?, ?, ?, ?,
      datetime('now'), datetime('now')
    )
  `).run(
    id,
    data.nombre,
    data.telefono    ?? null,
    data.direccion   ?? null,
    data.dni_cif     ?? null,
    accionPeticion,
    data.matricula             ?? null,
    data.marca_modelo          ?? null,
    data.fecha_entrada         ?? null,
    data.fecha_salida_estimada ?? null,
    data.descripcion_problema  ?? null,
  );

  return obtener(id)!;
}

export function actualizar(id: string, data: ActualizarSeguimientoDto): Seguimiento {
  const db = getDb();
  const seg = obtener(id);
  if (!seg) throw new Error('Seguimiento no encontrado');

  const accionPeticion = data.accion_peticion ?? data.peticion ?? seg.accion_peticion ?? seg.peticion;

  db.prepare(`
    UPDATE seguimiento SET
      nombre                 = ?,
      telefono               = ?,
      direccion              = ?,
      dni_cif                = ?,
      accion_peticion        = ?,
      notas                  = ?,
      fecha_visita           = ?,
      matricula              = ?,
      marca_modelo           = ?,
      fecha_entrada          = ?,
      fecha_salida_estimada  = ?,
      descripcion_problema   = ?,
      firma_entrada          = ?,
      firma_salida           = ?,
      updated_at             = datetime('now')
    WHERE id = ?
  `).run(
    data.nombre                ?? seg.nombre,
    data.telefono              ?? seg.telefono,
    data.direccion             ?? seg.direccion,
    data.dni_cif               ?? seg.dni_cif,
    accionPeticion,
    data.notas                 ?? seg.notas,
    data.fecha_visita          ?? seg.fecha_visita,
    data.matricula             ?? seg.matricula,
    data.marca_modelo          ?? seg.marca_modelo,
    data.fecha_entrada         ?? seg.fecha_entrada,
    data.fecha_salida_estimada ?? seg.fecha_salida_estimada,
    data.descripcion_problema  ?? seg.descripcion_problema,
    data.firma_entrada         ?? seg.firma_entrada,
    data.firma_salida          ?? seg.firma_salida,
    id,
  );

  return obtener(id)!;
}

export function eliminar(id: string): void {
  const db = getDb();
  const seg = obtener(id);
  if (!seg) throw new Error('Seguimiento no encontrado');
  // Se elimina únicamente el registro de seguimiento (capa de seguimiento/CRM).
  // El cliente, la obra y sus documentos (facturas, presupuestos) son entidades
  // de negocio independientes y se conservan: seguimiento.trabajo_id es una FK
  // hija, por lo que borrar esta fila no afecta al trabajo ni a sus documentos.
  db.prepare('DELETE FROM seguimiento WHERE id = ?').run(id);
}

// ─── Máquina de estados ───────────────────────────────────────────────────────

export function cambiarEstado(id: string, nuevoEstado: EstadoSeguimiento): Seguimiento {
  const db = getDb();
  const seg = obtener(id);
  if (!seg) throw new Error('Seguimiento no encontrado');

  // Cancelar solo es posible antes de iniciar la obra. La obra arranca al pasar
  // a en_curso (presupuesto aceptado); a partir de ahí no se admite cancelar.
  if (nuevoEstado === 'cancelado' && !ESTADOS_CANCELABLES.includes(seg.estado)) {
    throw Object.assign(
      new Error('No se puede cancelar: la obra ya está en curso. La cancelación solo es posible hasta que se acepta el presupuesto.'),
      { statusCode: 400 },
    );
  }

  // Al cancelar antes de iniciar la obra se limpian las entidades autocreadas
  // (presupuestos en borrador, obra, agrupador y, si queda vacío, el cliente).
  if (nuevoEstado === 'cancelado' && seg.trabajo_id) {
    _limpiarObraAlCancelar(db, seg.trabajo_id);
    db.prepare(`
      UPDATE seguimiento SET estado = 'cancelado', trabajo_id = NULL, updated_at = datetime('now') WHERE id = ?
    `).run(id);
    return obtener(id)!;
  }

  // Al pasar a pendiente_presupuesto (flujo reformas) o a en_curso (flujo
  // taller) se crea cliente + agrupador + obra si aún no existen, para poder
  // generar el presupuesto/factura sobre la obra.
  if ((nuevoEstado === 'pendiente_presupuesto' || nuevoEstado === 'en_curso') && !seg.trabajo_id) {
    _convertirACliente(db, seg, id);
  }

  // Antes de marcar como entregada, la factura debe tener un PDF generado
  // (para imprimir) o haberse enviado por email.
  if (nuevoEstado === 'entregada') {
    _verificarFacturaLista(db, seg.trabajo_id);
  }

  db.prepare(`
    UPDATE seguimiento SET estado = ?, updated_at = datetime('now') WHERE id = ?
  `).run(nuevoEstado, id);

  // Sync hacia documentos (usa el trabajo_id actualizado si acaba de crearse)
  const actualizado = obtener(id)!;
  if (actualizado.trabajo_id) {
    _syncDocumentosDesdeEstado(db, actualizado.trabajo_id, nuevoEstado);
    _syncTrabajoDesdeEstado(db, actualizado.trabajo_id, nuevoEstado);
  }

  return obtener(id)!;
}

// ─── Sync bidireccional ───────────────────────────────────────────────────────

/**
 * Llamada desde facturas.service.ts y presupuestos.service.ts tras cambiar estado.
 * Solo usa SQL directo — sin importar otros servicios — para evitar dependencias circulares.
 */
export function syncSeguimientoDesdeDocumento(
  trabajoId: string,
  tipo: 'factura' | 'presupuesto',
  nuevoEstadoDoc: string,
): void {
  const db = getDb();
  const seg = db
    .prepare('SELECT id, estado FROM seguimiento WHERE trabajo_id = ?')
    .get(trabajoId) as { id: string; estado: string } | undefined;
  if (!seg) return;

  let nuevoEstadoSeg: EstadoSeguimiento | null = null;

  if (tipo === 'presupuesto') {
    // rechazado/caducado → el usuario lo mueve a mano
    if (nuevoEstadoDoc === 'enviado')  nuevoEstadoSeg = 'a_la_espera';
    if (nuevoEstadoDoc === 'aceptado') nuevoEstadoSeg = 'en_curso';
  } else {
    // pendiente_pago → sin cambio de estado, solo warning en dashboard
    if (nuevoEstadoDoc === 'cerrada')   nuevoEstadoSeg = 'pendiente_facturar';
    if (nuevoEstadoDoc === 'entregada') nuevoEstadoSeg = 'entregada';
    if (nuevoEstadoDoc === 'pagada')    nuevoEstadoSeg = 'pagada';
  }

  if (nuevoEstadoSeg) {
    db.prepare(`
      UPDATE seguimiento SET estado = ?, updated_at = datetime('now') WHERE id = ?
    `).run(nuevoEstadoSeg, seg.id);
    _syncTrabajoDesdeEstado(db, trabajoId, nuevoEstadoSeg);
  }
}

// ─── Helpers privados ─────────────────────────────────────────────────────────

function _convertirACliente(
  db: ReturnType<typeof getDb>,
  seg: Seguimiento,
  segId: string,
): void {
  // Reutilizar cliente si el DNI/CIF ya existe
  const clienteExistente = db
    .prepare('SELECT id FROM clientes WHERE dni_cif = ? AND activo = 1')
    .get(seg.dni_cif) as { id: string } | undefined;

  const clienteId = clienteExistente?.id ?? (() => {
    const newId = uuidv4();
    db.prepare(`
      INSERT INTO clientes (id, nombre, dni_cif, telefono, activo, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).run(newId, seg.nombre, seg.dni_cif, seg.telefono ?? null);
    return newId;
  })();

  // Siempre se crea un agrupador nuevo (dirección distinta aunque sea el mismo cliente)
  const agrupadorId = uuidv4();
  db.prepare(`
    INSERT INTO agrupadores (id, cliente_id, label, activo, created_at, updated_at)
    VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))
  `).run(agrupadorId, clienteId, seg.direccion ?? 'Sin dirección');

  // Margen heredado de la configuración global
  let margenDefecto = 0;
  try {
    const cfg = getAppConfig();
    margenDefecto = cfg.documentos?.margen_defecto ?? 0;
  } catch { /* sin bloquear si la config no carga */ }

  const trabajoId = uuidv4();
  db.prepare(`
    INSERT INTO trabajos (id, agrupador_id, nombre, margen_porcentaje, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(trabajoId, agrupadorId, seg.peticion ?? 'Trabajo', margenDefecto);

  // Vincular seguimiento al trabajo recién creado
  db.prepare(`
    UPDATE seguimiento SET trabajo_id = ?, updated_at = datetime('now') WHERE id = ?
  `).run(trabajoId, segId);
}

/**
 * Mantiene trabajo.estado en sincronía con el estado del seguimiento.
 * El trabajo solo tiene 3 estados: 'activo' | 'completado' | 'cancelado'.
 * - entregada/pagada/completado → completado
 * - cancelado                   → cancelado
 * - resto                       → activo (reabre si el seguimiento retrocede)
 */
function _syncTrabajoDesdeEstado(
  db: ReturnType<typeof getDb>,
  trabajoId: string,
  estado: EstadoSeguimiento,
): void {
  let estadoTrabajo: 'activo' | 'completado' | 'cancelado';
  if (estado === 'entregada' || estado === 'pagada' || estado === 'completado') {
    estadoTrabajo = 'completado';
  } else if (estado === 'cancelado') {
    estadoTrabajo = 'cancelado';
  } else {
    estadoTrabajo = 'activo';
  }

  db.prepare(`
    UPDATE trabajos SET estado = ?, updated_at = datetime('now')
    WHERE id = ? AND estado != ?
  `).run(estadoTrabajo, trabajoId, estadoTrabajo);
}

function _syncDocumentosDesdeEstado(
  db: ReturnType<typeof getDb>,
  trabajoId: string,
  estado: EstadoSeguimiento,
): void {
  if (estado === 'en_curso') {
    // Presupuesto enviado → aceptado
    const pres = db.prepare(`
      SELECT id FROM presupuestos
      WHERE trabajo_id = ? AND estado = 'enviado'
      ORDER BY created_at DESC LIMIT 1
    `).get(trabajoId) as { id: string } | undefined;
    if (pres) {
      db.prepare(`
        UPDATE presupuestos SET estado = 'aceptado', updated_at = datetime('now') WHERE id = ?
      `).run(pres.id);
    }
  } else if (estado === 'entregada') {
    // Factura cerrada o entregada → pendiente_pago. Refresca updated_at, que es
    // el ancla del contador de cobro del dashboard (factura_sin_cobrar).
    const fac = db.prepare(`
      SELECT id FROM facturas
      WHERE trabajo_id = ? AND estado IN ('cerrada', 'entregada')
      ORDER BY created_at DESC LIMIT 1
    `).get(trabajoId) as { id: string } | undefined;
    if (fac) {
      db.prepare(`
        UPDATE facturas SET estado = 'pendiente_pago', updated_at = datetime('now') WHERE id = ?
      `).run(fac.id);
    }
  } else if (estado === 'pagada') {
    // Factura entregada o pendiente_pago → pagada
    const fac = db.prepare(`
      SELECT id FROM facturas
      WHERE trabajo_id = ? AND estado IN ('entregada', 'pendiente_pago')
      ORDER BY created_at DESC LIMIT 1
    `).get(trabajoId) as { id: string } | undefined;
    if (fac) {
      db.prepare(`
        UPDATE facturas SET estado = 'pagada', updated_at = datetime('now') WHERE id = ?
      `).run(fac.id);
    }
  }
}

/**
 * Verifica que la factura del trabajo esté lista para entregar: debe existir
 * una factura cerrada (o ya en proceso de cobro) con al menos un PDF generado.
 * El PDF se crea tanto al imprimir como al enviar por email.
 */
function _verificarFacturaLista(
  db: ReturnType<typeof getDb>,
  trabajoId: string | null,
): void {
  const fac = trabajoId
    ? (db.prepare(`
        SELECT id FROM facturas
        WHERE trabajo_id = ? AND estado IN ('cerrada', 'entregada', 'pendiente_pago')
        ORDER BY created_at DESC LIMIT 1
      `).get(trabajoId) as { id: string } | undefined)
    : undefined;

  if (!fac) {
    throw Object.assign(
      new Error('No hay una factura cerrada para entregar. Cierra la factura primero.'),
      { statusCode: 400 },
    );
  }

  const pdf = db.prepare(`
    SELECT id FROM factura_versiones WHERE factura_id = ? AND pdf_path IS NOT NULL LIMIT 1
  `).get(fac.id) as { id: string } | undefined;

  if (!pdf) {
    throw Object.assign(
      new Error('Genera el PDF o envía la factura por email antes de marcarla como entregada.'),
      { statusCode: 400 },
    );
  }
}

/**
 * Limpia las entidades autocreadas al cancelar un seguimiento antes de iniciar
 * la obra. Los presupuestos en borrador/enviado se borran físicamente (sus
 * líneas y versiones por cascada); la obra queda cancelada y el agrupador (y el
 * cliente si queda sin agrupadores activos) se desactivan (borrado lógico,
 * principio 5). En este punto del flujo nunca existen facturas ni albaranes.
 */
function _limpiarObraAlCancelar(
  db: ReturnType<typeof getDb>,
  trabajoId: string,
): void {
  const trabajo = db
    .prepare('SELECT agrupador_id FROM trabajos WHERE id = ?')
    .get(trabajoId) as { agrupador_id: string } | undefined;
  if (!trabajo) return;

  db.prepare('DELETE FROM presupuestos WHERE trabajo_id = ?').run(trabajoId);
  db.prepare(`
    UPDATE trabajos SET estado = 'cancelado', updated_at = datetime('now') WHERE id = ?
  `).run(trabajoId);
  db.prepare(`
    UPDATE agrupadores SET activo = 0, updated_at = datetime('now') WHERE id = ?
  `).run(trabajo.agrupador_id);

  const cli = db
    .prepare('SELECT cliente_id FROM agrupadores WHERE id = ?')
    .get(trabajo.agrupador_id) as { cliente_id: string } | undefined;
  if (cli) {
    const otros = db
      .prepare('SELECT COUNT(*) AS n FROM agrupadores WHERE cliente_id = ? AND activo = 1')
      .get(cli.cliente_id) as { n: number };
    if (otros.n === 0) {
      db.prepare(`
        UPDATE clientes SET activo = 0, updated_at = datetime('now') WHERE id = ?
      `).run(cli.cliente_id);
    }
  }
}