/**
 * ──────────────────────────────────────────────────────────────────────────────
 * SeguimientoFichaPage.tsx — Seguimiento detail + state machine (reformas & taller)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Single detail component serving BOTH reformas and taller profiles (taller
 *   fields gated by modulos.matriculas). Holds the seguimiento state machine
 *   (transitions derived from the profile's ordered estados list) and chains
 *   side-effects per transition: ask for visit date, auto-create the obra, offer
 *   to create the presupuesto/factura, require a closed+PDF invoice before
 *   entregada, and close the trabajo (pagada → completado). Cancellation is
 *   offered from any non-terminal state. Also edits the form and deletes.
 *
 * ROUTE
 *   /seguimiento/:id
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @store/seguimiento.store → cargar/actualizar/cambiarEstado/eliminar + types
 *     · @store/presupuestos.store, @store/facturas.store → crearPresupuesto/crearFactura
 *     · @store/config.store → profile (modulos.matriculas, seguimiento.label) + t()
 *     · @ui/Badge, @ui/Modal, @ui/Spinner → UI primitives
 *     · @utils/api → load linked presupuestos/facturas of the trabajo
 *   Backend:
 *     · GET /api/seguimiento/:id → detail with JOINs to trabajo/agrupador/cliente
 *     · PUT /api/seguimiento/:id → save form
 *     · POST /api/seguimiento/:id/estado → change state (auto-convert, guards)
 *     · DELETE /api/seguimiento/:id → delete record only
 *     · GET /api/presupuestos?trabajo_id= , GET /api/facturas?trabajo_id= → linked docs
 *   Used by:
 *     · Route /seguimiento/:id in App.tsx (inside Layout)
 *
 * INPUTS / OUTPUTS
 *   Input:  :id url param; form edits; state-transition clicks; confirm dialogs
 *   Output: persisted edits/state changes; navigation to document editors; deletion
 *
 * NOTES
 *   · Cancellation is allowed from any non-terminal state (not completado/
 *     cancelado). Before the obra starts it is free; from en_curso onwards
 *     (ESTADOS_OBRA_INICIADA) a motivo is mandatory and is recorded as a
 *     cliente_incidencia ("cliente difícil") shown on the cliente ficha; the
 *     obra is marked cancelado but its documents are preserved.
 *   · The flow's estados come from the profile config; reformas and taller only
 *     differ in that ordered list.
 *   · pagada is not terminal: the final transition is pagada → completado.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSeguimientoStore, EstadoSeguimiento } from '@store/seguimiento.store';
import { usePresupuestosStore } from '@store/presupuestos.store';
import { useFacturasStore } from '@store/facturas.store';
import { useConfigStore } from '@store/config.store';
import Badge from '@ui/Badge';
import Modal from '@ui/Modal';
import Spinner from '@ui/Spinner';
import api from '@utils/api';
import { listarPagos } from '@utils/pagos.api';

// ─── Máquina de estados ───────────────────────────────────────────────────────

// Estados en los que la obra ya está iniciada (presupuesto aceptado en adelante):
// cancelar sigue siendo posible pero EXIGE un motivo, que se registra como
// incidencia en la ficha del cliente ("cliente difícil").
const ESTADOS_OBRA_INICIADA: EstadoSeguimiento[] = [
  'en_curso', 'pendiente_facturar', 'entregada', 'pagada',
];

// Estados terminales: ya no admiten cancelación.
const ESTADOS_TERMINALES: EstadoSeguimiento[] = ['completado', 'cancelado'];

// Orden de respaldo si el perfil no trae seguimiento.estados (instalación previa
// al campo; el backend ya lo rellena, esto es solo defensa extra).
const ESTADOS_DEFECTO: EstadoSeguimiento[] = [
  'nuevo', 'contactado', 'visita_agendada', 'pendiente_presupuesto',
  'a_la_espera', 'en_curso', 'pendiente_facturar', 'entregada',
  'pagada', 'completado',
];

// Deriva las transiciones disponibles a partir de la lista ordenada de estados
// del perfil (config). El flujo avanza al siguiente estado de la lista; desde
// a_la_espera se puede re-presupuestar (volver a pendiente_presupuesto) y desde
// los estados cancelables se puede cancelar. Así no hay grafos hardcodeados por
// perfil: reformas y taller solo difieren en su lista de estados.
function getTransiciones(estado: EstadoSeguimiento, estadosPerfil: EstadoSeguimiento[]): EstadoSeguimiento[] {
  const out: EstadoSeguimiento[] = [];
  const idx = estadosPerfil.indexOf(estado);
  if (idx >= 0 && idx + 1 < estadosPerfil.length) out.push(estadosPerfil[idx + 1]);
  // Re-presupuestar: si el cliente no acepta, volver a pendiente_presupuesto.
  if (estado === 'a_la_espera' && estadosPerfil.includes('pendiente_presupuesto')) {
    out.push('pendiente_presupuesto');
  }
  // Cancelar es posible en cualquier punto salvo en los estados terminales.
  if (!ESTADOS_TERMINALES.includes(estado)) out.push('cancelado');
  return out;
}

const ESTADO_LABELS: Record<EstadoSeguimiento, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  visita_agendada: 'Visita agendada',
  pendiente_presupuesto: 'Pendiente presupuesto',
  a_la_espera: 'A la espera',
  en_curso: 'En curso',
  pendiente_facturar: 'Pendiente facturar',
  entregada: 'Entregada',
  pagada: 'Pagada',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ─── Campo editable ───────────────────────────────────────────────────────────

function Campo({ label, value, onChange, tipo = 'text', placeholder = '', required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  tipo?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span style={{ color: 'var(--accent)', marginLeft: 2 }}>*</span>}
      </label>
      {tipo === 'textarea'
        ? <textarea className="input" rows={3} style={{ resize: 'vertical' }} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
        : <input className="input" type={tipo} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? 'var(--text)' : 'var(--text-3)' }}>{value || '—'}</div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function SeguimientoFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { actual, cargando, error, cargarSeguimiento, actualizar, cambiarEstado, eliminar, limpiarActual } = useSeguimientoStore();
  const { crearPresupuesto } = usePresupuestosStore();
  const { crearFactura } = useFacturasStore();
  const { profile, t } = useConfigStore();

  const esTaller = profile?.modulos?.matriculas ?? false;
  const label = profile?.seguimiento?.label ?? 'Seguimiento';

  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  // Presupuestos del trabajo (carga cuando el seguimiento tiene trabajo_id)
  const [presupuestos, setPresupuestos] = useState<{ id: string; estado: string; fecha: string; importe: number }[]>([]);
  // Facturas del trabajo (carga cuando el seguimiento tiene trabajo_id)
  const [facturas, setFacturas] = useState<{ id: string; numero: string | null; estado: string; fecha: string; total: number }[]>([]);
  // Anticipos entregados para la obra vinculada
  const [anticipoTotal, setAnticipoTotal] = useState(0);

  const [confirmEstado, setConfirmEstado] = useState<EstadoSeguimiento | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [errEstado, setErrEstado] = useState<string | null>(null);
  const [fechaVisita, setFechaVisita] = useState('');
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [postAccion, setPostAccion] = useState<null | 'crear_presupuesto' | 'crear_factura' | 'cerrar_trabajo'>(null);
  const [accionLoading, setAccionLoading] = useState(false);

  useEffect(() => {
    if (id) cargarSeguimiento(id);
    return () => limpiarActual();
  }, [id]);

  useEffect(() => {
    if (!actual) return;
    setForm({
      nombre:                  actual.nombre ?? '',
      telefono:                actual.telefono ?? '',
      dni_cif:                 actual.dni_cif ?? '',
      direccion:               actual.direccion ?? '',
      peticion:                actual.peticion ?? '',
      notas:                   actual.notas ?? '',
      fecha_visita:            actual.fecha_visita ?? '',
      matricula:               actual.matricula ?? '',
      marca_modelo:            actual.marca_modelo ?? '',
      fecha_entrada:           actual.fecha_entrada ?? '',
      fecha_salida_estimada:   actual.fecha_salida_estimada ?? '',
      descripcion_problema:    actual.descripcion_problema ?? '',
      firma_entrada:           actual.firma_entrada ?? '',
      firma_salida:            actual.firma_salida ?? '',
    });
  }, [actual]);

  // Cargar presupuestos cuando hay trabajo vinculado
  useEffect(() => {
    if (!actual?.trabajo_id) { setPresupuestos([]); return; }
    api.get('/presupuestos', { params: { trabajo_id: actual.trabajo_id } })
      .then(res => setPresupuestos(res.data.data ?? res.data ?? []))
      .catch(() => setPresupuestos([]));
  }, [actual?.trabajo_id]);

  // Cargar facturas cuando hay trabajo vinculado
  useEffect(() => {
    if (!actual?.trabajo_id) { setFacturas([]); return; }
    api.get('/facturas', { params: { trabajo_id: actual.trabajo_id } })
      .then(res => setFacturas(res.data.data ?? res.data ?? []))
      .catch(() => setFacturas([]));
  }, [actual?.trabajo_id]);

  // Cargar anticipos entregados de la obra vinculada
  useEffect(() => {
    if (!actual?.trabajo_id) { setAnticipoTotal(0); return; }
    listarPagos(actual.trabajo_id)
      .then(res => setAnticipoTotal(res.total))
      .catch(() => setAnticipoTotal(0));
  }, [actual?.trabajo_id]);

  if (cargando && !actual) return <Spinner label="Cargando…" />;
  if (error) return <div className="page-error">{error}</div>;
  if (!actual) return <div className="page-error">Registro no encontrado</div>;

  const esCancelado = actual.estado === 'cancelado';

  // Estados del flujo según el perfil (config); las transiciones se derivan de
  // esa lista ordenada, sin grafos hardcodeados por perfil.
  const estadosPerfil = (profile?.seguimiento?.estados as EstadoSeguimiento[] | undefined) ?? ESTADOS_DEFECTO;
  const estadosDisponibles = getTransiciones(actual.estado, estadosPerfil);

  function setF(key: string) {
    return (v: string) => setForm(f => ({ ...f, [key]: v }));
  }

  async function handleGuardar() {
    if (!id || !form.nombre?.trim()) return;
    setGuardando(true);
    try {
      await actualizar(id, {
        nombre:                form.nombre,
        telefono:              form.telefono || undefined,
        dni_cif:               form.dni_cif || undefined,
        direccion:             form.direccion || undefined,
        peticion:              form.peticion || undefined,
        notas:                 form.notas || undefined,
        fecha_visita:          form.fecha_visita || undefined,
        matricula:             form.matricula || undefined,
        marca_modelo:          form.marca_modelo || undefined,
        fecha_entrada:         form.fecha_entrada || undefined,
        fecha_salida_estimada: form.fecha_salida_estimada || undefined,
        descripcion_problema:  form.descripcion_problema || undefined,
        firma_entrada:         form.firma_entrada || undefined,
        firma_salida:          form.firma_salida || undefined,
      });
      setEditando(false);
    } catch (e: any) {
      alert(e.response?.data?.error ?? e.message ?? 'Error guardando');
    } finally {
      setGuardando(false);
    }
  }

  async function handleCambiarEstado() {
    if (!id || !confirmEstado || !actual) return;
    // Al agendar la visita pedimos primero la fecha y la guardamos en fecha_visita
    if (confirmEstado === 'visita_agendada') {
      if (!fechaVisita) { setErrEstado('Indica la fecha de la visita'); return; }
      try {
        await actualizar(id, { fecha_visita: fechaVisita });
      } catch (e: any) {
        setErrEstado(e.response?.data?.error ?? e.message ?? 'Error guardando la fecha de visita');
        return;
      }
    }
    // Cancelar una obra ya iniciada exige un motivo (queda como incidencia del cliente).
    const requiereMotivo = confirmEstado === 'cancelado' && ESTADOS_OBRA_INICIADA.includes(actual.estado);
    if (requiereMotivo && !motivoCancelacion.trim()) {
      setErrEstado('Indica el motivo de la cancelación: quedará registrado en la ficha del cliente.');
      return;
    }
    const destino = confirmEstado;
    const motivo = confirmEstado === 'cancelado' && motivoCancelacion.trim() ? motivoCancelacion.trim() : undefined;
    const res = await cambiarEstado(id, destino, motivo);
    setConfirmEstado(null);
    if (!res.ok) { setErrEstado(res.error ?? 'Error cambiando estado'); return; }
    // Acciones posteriores según el estado alcanzado
    if (destino === 'pendiente_presupuesto') setPostAccion('crear_presupuesto');
    else if (destino === 'pendiente_facturar') setPostAccion('crear_factura');
    else if (destino === 'pagada') setPostAccion('cerrar_trabajo');
  }

  async function handleCrearPresupuesto() {
    if (!actual?.trabajo_id) { setPostAccion(null); return; }
    setAccionLoading(true);
    try {
      const nuevo = await crearPresupuesto({ trabajo_id: actual.trabajo_id });
      setPostAccion(null);
      navigate(`/presupuestos/${nuevo.id}`);
    } catch (e: any) {
      setErrEstado(e.response?.data?.error ?? e.message ?? 'Error creando el presupuesto');
      setPostAccion(null);
    } finally {
      setAccionLoading(false);
    }
  }

  async function handleCrearFactura() {
    if (!actual?.trabajo_id) { setPostAccion(null); return; }
    setAccionLoading(true);
    try {
      const aceptado = presupuestos.find(p => p.estado === 'aceptado') ?? presupuestos[0];
      const nueva = await crearFactura({
        trabajo_id: actual.trabajo_id,
        presupuesto_origen_id: aceptado?.id,
      });
      setPostAccion(null);
      navigate(`/facturas/${nueva.id}`);
    } catch (e: any) {
      setErrEstado(e.response?.data?.error ?? e.message ?? 'Error creando la factura');
      setPostAccion(null);
    } finally {
      setAccionLoading(false);
    }
  }

  async function handleCerrarTrabajo() {
    if (!id) return;
    setAccionLoading(true);
    const res = await cambiarEstado(id, 'completado');
    setAccionLoading(false);
    setPostAccion(null);
    if (!res.ok) setErrEstado(res.error ?? 'Error cerrando el trabajo');
  }

  async function handleEliminar() {
    if (!id) return;
    try {
      await eliminar(id);
      navigate('/seguimiento');
    } catch (e: any) {
      alert(e.response?.data?.error ?? e.message ?? 'No se puede eliminar');
    }
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Breadcrumb + acciones */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
          <Link to="/seguimiento" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>{label}</Link>
          <span>/</span>
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{actual.nombre}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {!esCancelado && (
            !editando ? (
              <button className="btn btn-ghost" onClick={() => setEditando(true)}>Editar</button>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={() => setEditando(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleGuardar} disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </>
            )
          )}
          {!editando && (
            <button
              className="btn btn-ghost btn-icon-danger"
              onClick={() => setConfirmEliminar(true)}
            >
              Eliminar
            </button>
          )}
        </div>
      </div>

      {/* Estado + transiciones */}
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Badge estado={actual.estado} />
          {actual.trabajo_id && (
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
              {actual.cliente_nombre} · {actual.trabajo_nombre}
            </span>
          )}
        </div>
        {estadosDisponibles.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {estadosDisponibles.map(e => (
              e === 'completado' ? (
                <button
                  key={e}
                  className="btn btn-sm btn-primary"
                  onClick={() => { setErrEstado(null); setPostAccion('cerrar_trabajo'); }}
                >
                  ✓ Cerrar trabajo
                </button>
              ) : (
                <button
                  key={e}
                  className={`btn btn-sm ${e === 'cancelado' ? 'btn-danger' : 'btn-ghost'}`}
                  onClick={() => { setErrEstado(null); setFechaVisita(actual.fecha_visita ?? ''); setMotivoCancelacion(''); setConfirmEstado(e); }}
                >
                  {e === 'cancelado' ? '✕ Cancelar' : `→ ${ESTADO_LABELS[e]}`}
                </button>
              )
            ))}
          </div>
        )}
      </div>

      {errEstado && (
        <div style={{ padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--red)' }}>
          {errEstado}
        </div>
      )}

      {esCancelado && (
        <div style={{ padding: '12px 16px', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--red)', fontWeight: 500 }}>
          Seguimiento cancelado — solo lectura.
        </div>
      )}

      {/* Datos del formulario */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 16, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Datos del cliente
        </div>

        {editando ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Campo label="Nombre" value={form.nombre} onChange={setF('nombre')} required placeholder="Nombre completo" />
              <Campo label="Teléfono" value={form.telefono} onChange={setF('telefono')} placeholder="612 345 678" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Campo label="DNI / CIF" value={form.dni_cif} onChange={setF('dni_cif')} placeholder="12345678A" />
              {!esTaller && <Campo label="Dirección" value={form.direccion} onChange={setF('direccion')} placeholder="Calle, ciudad…" />}
            </div>
            {!esTaller && (
              <>
                <Campo label="Petición" value={form.peticion} onChange={setF('peticion')} tipo="textarea" placeholder="¿Qué necesita?" />
                <Campo label="Notas internas" value={form.notas} onChange={setF('notas')} tipo="textarea" placeholder="Notas…" />
                <Campo label="Fecha de visita" value={form.fecha_visita} onChange={setF('fecha_visita')} tipo="date" />
              </>
            )}
            {esTaller && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Campo label="Matrícula" value={form.matricula} onChange={setF('matricula')} placeholder="1234-ABC" />
                  <Campo label="Marca / Modelo" value={form.marca_modelo} onChange={setF('marca_modelo')} placeholder="Seat León 2019" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Campo label="Fecha de entrada" value={form.fecha_entrada} onChange={setF('fecha_entrada')} tipo="date" />
                  <Campo label="Fecha salida estimada" value={form.fecha_salida_estimada} onChange={setF('fecha_salida_estimada')} tipo="date" />
                </div>
                <Campo label="Descripción del problema" value={form.descripcion_problema} onChange={setF('descripcion_problema')} tipo="textarea" placeholder="Descripción…" />
                <Campo label="Notas internas" value={form.notas} onChange={setF('notas')} tipo="textarea" placeholder="Notas…" />
                <div style={{ padding: '12px', background: 'var(--bg-3)', borderRadius: 'var(--radius)', border: '1px dashed var(--border-2)', fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
                  Las firmas digitales con tablet estarán disponibles en próximas versiones
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InfoRow label="Nombre" value={actual.nombre} />
            <InfoRow label="Teléfono" value={actual.telefono} />
            <InfoRow label="DNI / CIF" value={actual.dni_cif} />
            {!esTaller && <InfoRow label="Dirección" value={actual.direccion} />}
            {esTaller && (
              <>
                <InfoRow label="Matrícula" value={actual.matricula} />
                <InfoRow label="Marca / Modelo" value={actual.marca_modelo} />
                <InfoRow label="Fecha entrada" value={fmtFecha(actual.fecha_entrada)} />
                <InfoRow label="Fecha salida est." value={fmtFecha(actual.fecha_salida_estimada)} />
              </>
            )}
            <InfoRow label="Creado" value={fmtFecha(actual.created_at)} />
            <InfoRow label="Actualizado" value={fmtFecha(actual.updated_at)} />
            {!esTaller && actual.fecha_visita && <InfoRow label="Visita" value={fmtFecha(actual.fecha_visita)} />}
          </div>
        )}
      </div>

      {/* Petición / descripción — solo lectura */}
      {!editando && (
        <>
          {!esTaller && (actual.peticion || actual.notas) && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {actual.peticion && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Petición</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7 }}>{actual.peticion}</div>
                </div>
              )}
              {actual.notas && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Notas internas</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-2)' }}>{actual.notas}</div>
                </div>
              )}
            </div>
          )}
          {esTaller && (actual.descripcion_problema || actual.notas) && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {actual.descripcion_problema && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Descripción del problema</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7 }}>{actual.descripcion_problema}</div>
                </div>
              )}
              {actual.notas && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Notas</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-2)' }}>{actual.notas}</div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Trabajo vinculado + presupuestos */}
      {actual.trabajo_id && (
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                {t('entidades.trabajo')} vinculado
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{actual.trabajo_nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{actual.cliente_nombre} · {actual.agrupador_label}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/presupuestos?trabajo=${actual.trabajo_id}`)}>
                Presupuestos
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/facturas?trabajo=${actual.trabajo_id}`)}>
                Facturas
              </button>
            </div>
          </div>

          {/* Lista de presupuestos del trabajo */}
          {presupuestos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Presupuestos
              </div>
              {presupuestos.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(110px, max-content) 64px 1fr max-content',
                    alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 'var(--radius)',
                    background: 'var(--bg-3)', cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/presupuestos/${p.id}`)}
                >
                  <Badge estado={p.estado} />
                  <span />
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmtFecha(p.fecha)}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>
                    {Number(p.importe ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Lista de facturas del trabajo */}
          {facturas.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Facturas
              </div>
              {facturas.map(f => (
                <div
                  key={f.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(110px, max-content) 64px 1fr max-content',
                    alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 'var(--radius)',
                    background: 'var(--bg-3)', cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/facturas/${f.id}`)}
                >
                  <Badge estado={f.estado} />
                  <span style={{ fontSize: 12, color: 'var(--text)' }}>
                    {f.numero ? `#${f.numero}` : 'Borrador'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmtFecha(f.fecha)}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>
                    {Number(f.total ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Anticipos entregados para la obra */}
          {anticipoTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Anticipos entregados</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1f7a3d' }}>
                {anticipoTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </span>
            </div>
          )}
        </div>
      )}

      {/* Modal confirmar cambio de estado */}
      {confirmEstado && actual && (
        <Modal
          title={confirmEstado === 'cancelado' ? 'Cancelar seguimiento' : 'Cambiar estado'}
          size="sm"
          onClose={() => setConfirmEstado(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmEstado(null)}>Volver</button>
              <button
                className={`btn ${confirmEstado === 'cancelado' ? 'btn-danger' : 'btn-primary'}`}
                onClick={handleCambiarEstado}
                disabled={
                  (confirmEstado === 'visita_agendada' && !fechaVisita) ||
                  (confirmEstado === 'cancelado' && ESTADOS_OBRA_INICIADA.includes(actual.estado) && !motivoCancelacion.trim())
                }
              >
                {confirmEstado === 'cancelado' ? 'Sí, cancelar' : 'Confirmar'}
              </button>
            </>
          }
        >
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            {confirmEstado === 'cancelado' ? (
              <>
                ¿Cancelar el seguimiento de <strong>{actual.nombre}</strong>?
                {ESTADOS_OBRA_INICIADA.includes(actual.estado) ? (
                  <>
                    <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-2)' }}>
                      La obra ya está en curso. Indica el motivo: quedará registrado en
                      la ficha del {t('entidades.cliente').toLowerCase()} como incidencia.
                      Los documentos (facturas, presupuestos) se conservan.
                    </div>
                    <div className="form-group" style={{ marginTop: 12 }}>
                      <label className="form-label">
                        Motivo de la cancelación<span style={{ color: 'var(--accent)', marginLeft: 2 }}>*</span>
                      </label>
                      <textarea
                        className="input"
                        rows={3}
                        style={{ resize: 'vertical' }}
                        placeholder="Ej. el cliente cambia de opinión a mitad de obra, impagos, conflictos…"
                        value={motivoCancelacion}
                        onChange={e => setMotivoCancelacion(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-2)' }}>
                    El registro quedará marcado como cancelado. No se eliminará y podrá consultarse.
                  </div>
                )}
              </>
            ) : (
              <>
                ¿Cambiar estado a <strong>{ESTADO_LABELS[confirmEstado]}</strong>?
                {confirmEstado === 'visita_agendada' && (
                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label className="form-label">
                      Fecha de visita<span style={{ color: 'var(--accent)', marginLeft: 2 }}>*</span>
                    </label>
                    <input
                      className="input"
                      type="date"
                      value={fechaVisita}
                      onChange={e => setFechaVisita(e.target.value)}
                    />
                  </div>
                )}
                {confirmEstado === 'pendiente_presupuesto' && !actual.trabajo_id && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                    Se creará el {t('entidades.cliente').toLowerCase()}, {t('entidades.agrupador').toLowerCase()} y {t('entidades.trabajo').toLowerCase()}, y podrás crear el presupuesto a continuación.
                  </div>
                )}
                {confirmEstado === 'en_curso' && !actual.trabajo_id && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                    Se creará automáticamente un cliente, {t('entidades.agrupador').toLowerCase()} y {t('entidades.trabajo').toLowerCase()} a partir de los datos del formulario.
                    {!actual.dni_cif && (
                      <div style={{ marginTop: 6, color: 'var(--text-2)' }}>
                        Recomendable indicar el DNI/CIF para la facturación.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Modal acción posterior: crear presupuesto */}
      {postAccion === 'crear_presupuesto' && (
        <Modal
          title="Crear presupuesto"
          size="sm"
          onClose={() => setPostAccion(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setPostAccion(null)}>Más tarde</button>
              <button className="btn btn-primary" onClick={handleCrearPresupuesto} disabled={accionLoading}>
                {accionLoading ? 'Creando…' : 'Crear presupuesto'}
              </button>
            </>
          }
        >
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            Se han creado el {t('entidades.cliente').toLowerCase()} y la {t('entidades.trabajo').toLowerCase()}.
            ¿Quieres crear el presupuesto ahora?
          </div>
        </Modal>
      )}

      {/* Modal acción posterior: crear factura desde el presupuesto */}
      {postAccion === 'crear_factura' && (
        <Modal
          title="Crear factura"
          size="sm"
          onClose={() => setPostAccion(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setPostAccion(null)}>Más tarde</button>
              <button className="btn btn-primary" onClick={handleCrearFactura} disabled={accionLoading}>
                {accionLoading ? 'Creando…' : 'Crear factura'}
              </button>
            </>
          }
        >
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            Se generará una factura en borrador a partir del presupuesto aceptado.
            Podrás revisarla y cerrarla antes de entregarla.
          </div>
        </Modal>
      )}

      {/* Modal acción posterior: cerrar el trabajo (pagada → completado) */}
      {postAccion === 'cerrar_trabajo' && (
        <Modal
          title="Cerrar trabajo"
          size="sm"
          onClose={() => setPostAccion(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setPostAccion(null)}>Todavía no</button>
              <button className="btn btn-primary" onClick={handleCerrarTrabajo} disabled={accionLoading}>
                {accionLoading ? 'Cerrando…' : 'Sí, cerrar trabajo'}
              </button>
            </>
          }
        >
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            La factura está cobrada. ¿Está todo correcto y quieres cerrar el trabajo
            como <strong>completado</strong>?
          </div>
        </Modal>
      )}

      {/* Modal confirmar eliminar */}
      {confirmEliminar && (
        <Modal
          title="Eliminar registro"
          size="sm"
          onClose={() => setConfirmEliminar(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmEliminar(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleEliminar}>
                Eliminar
              </button>
            </>
          }
        >
          <div style={{ fontSize: 14 }}>
            ¿Eliminar <strong>{actual.nombre}</strong>? Esta acción no se puede deshacer.
            {actual.trabajo_id && (
              <div style={{ marginTop: 8, color: 'var(--text-2)', fontSize: 13 }}>
                Solo se elimina el registro de {label.toLowerCase()}; {t('entidades.cliente').toLowerCase()}, {t('entidades.trabajo').toLowerCase()} y sus documentos (facturas, presupuestos) se conservan.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}