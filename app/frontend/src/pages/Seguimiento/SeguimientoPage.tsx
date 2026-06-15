import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeguimientoStore, EstadoSeguimiento, Seguimiento, CrearSeguimientoDto } from '@store/seguimiento.store';
import { useConfigStore } from '@store/config.store';
import Badge from '@ui/Badge';
import Modal from '@ui/Modal';
import Spinner from '@ui/Spinner';

const ESTADOS_SEGUIMIENTO: { value: EstadoSeguimiento | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'visita_agendada', label: 'Visita agendada' },
  { value: 'pendiente_presupuesto', label: 'Pendiente presupuesto' },
  { value: 'a_la_espera', label: 'A la espera' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'pendiente_facturar', label: 'Pendiente facturar' },
  { value: 'entregada', label: 'Entregada' },
  { value: 'pagada', label: 'Pagada' },
  { value: 'completado', label: 'Completado' },
];

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function SeguimientoPage() {
  const navigate = useNavigate();
  const { lista, cargando, error, filtroEstado, cargarLista, crear, setFiltroEstado } = useSeguimientoStore();
  const { profile, t } = useConfigStore();
  const esTaller = profile?.modulos?.matriculas ?? false;
  const label = profile?.seguimiento?.label ?? 'Seguimiento';

  const [modalNuevo, setModalNuevo] = useState(false);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState<Partial<CrearSeguimientoDto>>({});

  useEffect(() => { cargarLista(filtroEstado || undefined); }, [filtroEstado]);

  async function handleCrear() {
    if (!form.nombre?.trim()) return;
    setCreando(true);
    try {
      const nuevo = await crear(form as CrearSeguimientoDto);
      setModalNuevo(false);
      setForm({});
      navigate(`/seguimiento/${nuevo.id}`);
    } catch (e: any) {
      alert(e.response?.data?.error ?? e.message ?? 'Error creando');
    } finally {
      setCreando(false);
    }
  }

  function handleFiltro(estado: EstadoSeguimiento | '') {
    setFiltroEstado(estado);
  }

  if (cargando && lista.length === 0) return <Spinner label={`Cargando ${label.toLowerCase()}…`} />;

  return (
    <div className="scroll-page" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1100 }}>

      {/* Cabecera */}
      <div className="page-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{label}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {esTaller ? t('entidades.trabajos') : 'Seguimiento de clientes potenciales'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalNuevo(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {esTaller ? `Nueva ${t('entidades.trabajo')}` : 'Nuevo seguimiento'}
        </button>
      </div>

      {/* Filtro por estado */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {ESTADOS_SEGUIMIENTO.map(e => (
          <button
            key={e.value}
            className={`btn btn-sm ${filtroEstado === e.value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleFiltro(e.value)}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && <div className="page-error">{error}</div>}

      {/* Tabla */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {lista.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>
              {filtroEstado ? `Sin registros en estado "${filtroEstado}"` : `Sin ${label.toLowerCase()} todavía`}
            </div>
            <div style={{ fontSize: 12 }}>Pulsa el botón para crear el primero</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="th">Estado</th>
                  <th className="th">Nombre</th>
                  {esTaller
                    ? <><th className="th">Matrícula</th><th className="th">Marca / Modelo</th></>
                    : <><th className="th">Teléfono</th><th className="th">Dirección</th></>
                  }
                  <th className="th">Fecha</th>
                  <th className="th">{t('entidades.trabajo')}</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((s: Seguimiento) => (
                  <tr
                    key={s.id}
                    className="tr-clickable"
                    onClick={() => navigate(`/seguimiento/${s.id}`)}
                  >
                    <td className="td"><Badge estado={s.estado} /></td>
                    <td className="td" style={{ fontWeight: 500 }}>{s.nombre}</td>
                    {esTaller
                      ? <>
                          <td className="td">{s.matricula ?? '—'}</td>
                          <td className="td" style={{ color: 'var(--text-2)' }}>{s.marca_modelo ?? '—'}</td>
                        </>
                      : <>
                          <td className="td" style={{ color: 'var(--text-2)' }}>{s.telefono ?? '—'}</td>
                          <td className="td" style={{ color: 'var(--text-2)' }}>{s.direccion ?? '—'}</td>
                        </>
                    }
                    <td className="td" style={{ color: 'var(--text-2)' }}>{fmtFecha(s.created_at)}</td>
                    <td className="td" style={{ color: 'var(--text-2)', fontSize: 12 }}>
                      {s.trabajo_nombre
                        ? <span style={{ color: 'var(--accent)' }}>{s.cliente_nombre} · {s.trabajo_nombre}</span>
                        : '—'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nuevo */}
      {modalNuevo && (
        <Modal
          title={esTaller ? `Nueva ${t('entidades.trabajo')}` : 'Nuevo seguimiento'}
          size="md"
          onClose={() => { setModalNuevo(false); setForm({}); }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setModalNuevo(false); setForm({}); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCrear} disabled={creando || !form.nombre?.trim()}>
                {creando ? 'Creando…' : 'Crear'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Nombre <span style={{ color: 'var(--accent)' }}>*</span></label>
              <input
                className="input"
                placeholder="Nombre del cliente"
                value={form.nombre ?? ''}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                autoFocus
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input className="input" placeholder="612 345 678" value={form.telefono ?? ''} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">DNI / CIF</label>
                <input className="input" placeholder="12345678A" value={form.dni_cif ?? ''} onChange={e => setForm(f => ({ ...f, dni_cif: e.target.value }))} />
              </div>
            </div>
            {esTaller ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Matrícula</label>
                    <input className="input" placeholder="1234-ABC" value={form.matricula ?? ''} onChange={e => setForm(f => ({ ...f, matricula: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Marca / Modelo</label>
                    <input className="input" placeholder="Seat León 2019" value={form.marca_modelo ?? ''} onChange={e => setForm(f => ({ ...f, marca_modelo: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción del problema</label>
                  <textarea className="input" rows={3} style={{ resize: 'vertical' }} placeholder="Descripción…" value={form.descripcion_problema ?? ''} onChange={e => setForm(f => ({ ...f, descripcion_problema: e.target.value }))} />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Dirección</label>
                  <input className="input" placeholder="Calle, ciudad…" value={form.direccion ?? ''} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Petición / Acción solicitada</label>
                  <textarea className="input" rows={3} style={{ resize: 'vertical' }} placeholder="¿Qué necesita el cliente?" value={form.peticion ?? ''} onChange={e => setForm(f => ({ ...f, peticion: e.target.value }))} />
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}