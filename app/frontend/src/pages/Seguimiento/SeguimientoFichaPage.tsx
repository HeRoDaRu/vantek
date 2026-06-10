import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSeguimientoStore, EstadoSeguimiento } from '@store/seguimiento.store';
import { useConfigStore } from '@store/config.store';
import Badge from '@ui/Badge';
import Modal from '@ui/Modal';
import Spinner from '@ui/Spinner';

// ─── Máquina de estados ───────────────────────────────────────────────────────

const TRANSICIONES: Record<EstadoSeguimiento, EstadoSeguimiento[]> = {
  nuevo:                  ['contactado'],
  contactado:             ['visita_agendada'],
  visita_agendada:        ['pendiente_presupuesto'],
  pendiente_presupuesto:  ['a_la_espera'],
  a_la_espera:            ['en_curso', 'pendiente_presupuesto'],
  en_curso:               ['pendiente_facturar'],
  pendiente_facturar:     ['entregada'],
  entregada:              ['pagada'],
  pagada:                 [],
};

const ESTADOS_TALLER: EstadoSeguimiento[] = [
  'nuevo', 'en_curso', 'pendiente_facturar', 'entregada', 'pagada',
];

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
};

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ─── Componente de fila editable ──────────────────────────────────────────────

function Campo({ label, value, onChange, tipo = 'text', placeholder = '', required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  tipo?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && <span style={{ color: 'var(--accent)', marginLeft: 2 }}>*</span>}</label>
      {tipo === 'textarea'
        ? <textarea className="input" rows={3} style={{ resize: 'vertical' }} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
        : <input className="input" type={tipo} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function SeguimientoFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { actual, cargando, error, cargarSeguimiento, actualizar, cambiarEstado, eliminar, limpiarActual } = useSeguimientoStore();
  const { profile, t } = useConfigStore();

  const esTaller = profile?.modulos?.matriculas ?? false;
  const label = profile?.seguimiento?.label ?? 'Seguimiento';

  // Formulario local (edición en página, no modal)
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  // Modales
  const [confirmEstado, setConfirmEstado] = useState<EstadoSeguimiento | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [errEstado, setErrEstado] = useState<string | null>(null);

  useEffect(() => {
    if (id) cargarSeguimiento(id);
    return () => limpiarActual();
  }, [id]);

  useEffect(() => {
    if (actual) {
      setForm({
        nombre: actual.nombre ?? '',
        telefono: actual.telefono ?? '',
        dni_cif: actual.dni_cif ?? '',
        direccion: actual.direccion ?? '',
        peticion: actual.peticion ?? '',
        notas: actual.notas ?? '',
        fecha_visita: actual.fecha_visita ?? '',
        // Taller
        matricula: actual.matricula ?? '',
        marca_modelo: actual.marca_modelo ?? '',
        fecha_entrada: actual.fecha_entrada ?? '',
        fecha_salida_estimada: actual.fecha_salida_estimada ?? '',
        descripcion_problema: actual.descripcion_problema ?? '',
        firma_entrada: actual.firma_entrada ?? '',
        firma_salida: actual.firma_salida ?? '',
      });
    }
  }, [actual]);

  if (cargando && !actual) return <Spinner label="Cargando…" />;
  if (error) return <div className="page-error">{error}</div>;
  if (!actual) return <div className="page-error">Registro no encontrado</div>;

  const estadosDisponibles = esTaller
    ? TRANSICIONES[actual.estado].filter(e => ESTADOS_TALLER.includes(e))
    : TRANSICIONES[actual.estado];

  async function handleGuardar() {
    if (!id || !form.nombre?.trim()) return;
    setGuardando(true);
    try {
      await actualizar(id, {
        nombre: form.nombre,
        telefono: form.telefono || undefined,
        dni_cif: form.dni_cif || undefined,
        direccion: form.direccion || undefined,
        peticion: form.peticion || undefined,
        notas: form.notas || undefined,
        fecha_visita: form.fecha_visita || undefined,
        matricula: form.matricula || undefined,
        marca_modelo: form.marca_modelo || undefined,
        fecha_entrada: form.fecha_entrada || undefined,
        fecha_salida_estimada: form.fecha_salida_estimada || undefined,
        descripcion_problema: form.descripcion_problema || undefined,
        firma_entrada: form.firma_entrada || undefined,
        firma_salida: form.firma_salida || undefined,
      });
      setEditando(false);
    } catch (e: any) {
      alert(e.response?.data?.error ?? e.message ?? 'Error guardando');
    } finally {
      setGuardando(false);
    }
  }

  async function handleCambiarEstado() {
    if (!id || !confirmEstado) return;
    const res = await cambiarEstado(id, confirmEstado);
    setConfirmEstado(null);
    if (!res.ok) {
      setErrEstado(res.error ?? 'Error cambiando estado');
    } else if (res.trabajo_id) {
      // Si se creó un trabajo, ofrecer navegar
      // El seguimiento ya se actualizó en el store
    }
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

  function setF(key: string) {
    return (v: string) => setForm(f => ({ ...f, [key]: v }));
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
          {!editando ? (
            <button className="btn btn-ghost" onClick={() => setEditando(true)}>Editar</button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={() => { setEditando(false); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </>
          )}
          {!actual.trabajo_id && (
            <button
              className="btn btn-ghost"
              style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
              onClick={() => setConfirmEliminar(true)}
            >
              Eliminar
            </button>
          )}
        </div>
      </div>

      {/* Estado actual + transiciones */}
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Badge estado={actual.estado} />
          {actual.trabajo_id && (
            <Link
              to={`/clientes`}
              style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}
            >
              {actual.cliente_nombre} · {actual.trabajo_nombre}
            </Link>
          )}
        </div>
        {estadosDisponibles.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {estadosDisponibles.map(e => (
              <button
                key={e}
                className="btn btn-sm btn-ghost"
                onClick={() => { setErrEstado(null); setConfirmEstado(e); }}
              >
                → {ESTADO_LABELS[e]}
              </button>
            ))}
          </div>
        )}
      </div>

      {errEstado && (
        <div style={{ padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--red)' }}>
          {errEstado}
        </div>
      )}

      {/* Datos del formulario */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
                {/* Firmas — stub Fase 5 */}
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

      {/* Petición / descripción (solo lectura cuando no edita) */}
      {!editando && (
        <>
          {!esTaller && (actual.peticion || actual.notas) && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {actual.peticion && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Petición</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)' }}>{actual.peticion}</div>
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
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)' }}>{actual.descripcion_problema}</div>
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

      {/* Trabajo vinculado */}
      {actual.trabajo_id && (
        <div style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {t('entidades.trabajo')} vinculado
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{actual.trabajo_nombre}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{actual.cliente_nombre} · {actual.agrupador_label}</div>
          </div>
          <Link to={`/clientes`} className="btn btn-ghost" style={{ fontSize: 12 }}>
            Ver ficha cliente →
          </Link>
        </div>
      )}

      {/* Modal confirmar cambio de estado */}
      {confirmEstado && (
        <Modal
          title="Cambiar estado"
          size="sm"
          onClose={() => setConfirmEstado(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmEstado(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCambiarEstado}>Confirmar</button>
            </>
          }
        >
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            ¿Cambiar estado a <strong>{ESTADO_LABELS[confirmEstado]}</strong>?
            {confirmEstado === 'en_curso' && !actual.trabajo_id && (
              <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                Se creará automáticamente un cliente, {t('entidades.agrupador').toLowerCase()} y {t('entidades.trabajo').toLowerCase()} a partir de los datos del formulario.
                {!actual.dni_cif && (
                  <div style={{ marginTop: 6, color: 'var(--red)', fontWeight: 500 }}>
                    ⚠ El DNI/CIF es obligatorio para convertir en cliente.
                  </div>
                )}
              </div>
            )}
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
              <button
                className="btn"
                style={{ background: 'var(--red)', color: '#fff' }}
                onClick={handleEliminar}
              >
                Eliminar
              </button>
            </>
          }
        >
          <div style={{ fontSize: 14 }}>
            ¿Eliminar <strong>{actual.nombre}</strong>? Esta acción no se puede deshacer.
          </div>
        </Modal>
      )}
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