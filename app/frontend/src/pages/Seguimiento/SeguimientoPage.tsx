/**
 * ──────────────────────────────────────────────────────────────────────────────
 * SeguimientoPage.tsx — Seguimiento / órdenes de trabajo list
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Lists seguimiento records with a state filter, lets the user create a new
 *   one (nombre required) and navigate to its ficha, and prints the visible
 *   list filtered by a created_at date range. Columns and the new-record form
 *   adapt to the profile: taller (modulos.matriculas) shows matrícula/marca/
 *   problema, reformas shows teléfono/dirección/petición.
 *
 * ROUTE
 *   /seguimiento
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @store/seguimiento.store → cargarLista/crear/setFiltroEstado + state
 *     · @store/config.store → profile (modulos.matriculas, seguimiento.label) + t()
 *     · @ui/Badge, @ui/Modal, @ui/Spinner → UI primitives
 *   Backend (via store):
 *     · GET /api/seguimiento?estado= → load/filter list
 *     · POST /api/seguimiento → create record
 *   Used by:
 *     · Route /seguimiento in App.tsx (inside Layout)
 *
 * INPUTS / OUTPUTS
 *   Input:  state filter, date range, new-record form, print button
 *   Output: rendered list; navigation to /seguimiento/:id; print window
 *
 * NOTES
 *   · Single component for both reformas and taller; the modulos.matriculas flag
 *     toggles taller-specific columns and fields.
 *   · Print HTML escapes all values (escapeHtml) before injection.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeguimientoStore, EstadoSeguimiento, Seguimiento, CrearSeguimientoDto } from '@store/seguimiento.store';
import { useConfigStore } from '@store/config.store';
import Badge from '@ui/Badge';
import Modal from '@ui/Modal';
import Spinner from '@ui/Spinner';

// Etiqueta legible de cada estado. El orden y el subconjunto aplicables a cada
// perfil vienen de profile.seguimiento.estados (config), no se codifican aquí.
const ESTADO_LABEL: Record<string, string> = {
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

// Orden de respaldo si el perfil no trae seguimiento.estados (instalación previa
// al campo; el backend ya lo rellena, esto es solo defensa extra).
const ESTADOS_DEFECTO = [
  'nuevo', 'contactado', 'visita_agendada', 'pendiente_presupuesto',
  'a_la_espera', 'en_curso', 'pendiente_facturar', 'entregada',
  'pagada', 'completado',
];

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
}

// Escapa texto para insertarlo de forma segura en el HTML de impresión.
function escapeHtml(valor: unknown): string {
  return String(valor ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function SeguimientoPage() {
  const navigate = useNavigate();
  const { lista, cargando, error, filtroEstado, cargarLista, crear, setFiltroEstado } = useSeguimientoStore();
  const { profile, t } = useConfigStore();
  const esTaller = profile?.modulos?.matriculas ?? false;
  const label = profile?.seguimiento?.label ?? 'Seguimiento';

  // Opciones del filtro de estado: vienen del perfil (config), no se codifican.
  const opcionesFiltro: { value: EstadoSeguimiento | ''; label: string }[] = [
    { value: '', label: 'Todos' },
    ...((profile?.seguimiento?.estados ?? ESTADOS_DEFECTO).map(e => ({
      value: e as EstadoSeguimiento,
      label: ESTADO_LABEL[e] ?? e,
    }))),
  ];

  const [modalNuevo, setModalNuevo] = useState(false);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState<Partial<CrearSeguimientoDto>>({});
  const [rangoDesde, setRangoDesde] = useState('');
  const [rangoHasta, setRangoHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');

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

  // ─── Impresión por rango de fechas ─────────────────────────────────
  // Filtra la lista visible por created_at dentro del rango y abre una ventana
  // limpia para imprimir. Sin rango, imprime todos los registros visibles.
  function filtrarPorRango(items: Seguimiento[]): Seguimiento[] {
    return items.filter(s => {
      const fecha = s.created_at.slice(0, 10);
      if (rangoDesde && fecha < rangoDesde) return false;
      if (rangoHasta && fecha > rangoHasta) return false;
      return true;
    });
  }

  function handleImprimir() {
    const items = filtrarPorRango(lista);
    if (items.length === 0) {
      alert('No hay registros en el rango seleccionado.');
      return;
    }

    const cabeceras = esTaller
      ? ['Estado', 'Nombre', 'Matrícula', 'Marca / Modelo', 'Problema', 'Fecha', 'Obra']
      : ['Estado', 'Nombre', 'Teléfono', 'Dirección', 'Petición', 'Fecha', 'Obra'];

    const filas = items.map(s => {
      const col3 = esTaller ? s.matricula : s.telefono;
      const col4 = esTaller ? s.marca_modelo : s.direccion;
      const col5 = esTaller ? s.descripcion_problema : s.peticion;
      const obra = s.trabajo_nombre ? `${s.cliente_nombre ?? ''} · ${s.trabajo_nombre}` : '—';
      return `<tr>
        <td>${escapeHtml(ESTADO_LABEL[s.estado] ?? s.estado)}</td>
        <td>${escapeHtml(s.nombre)}</td>
        <td>${escapeHtml(col3)}</td>
        <td>${escapeHtml(col4)}</td>
        <td>${escapeHtml(col5)}</td>
        <td>${escapeHtml(fmtFecha(s.created_at))}</td>
        <td>${escapeHtml(obra)}</td>
      </tr>`;
    }).join('');

    const subtitulo = [
      filtroEstado ? `Estado: ${ESTADO_LABEL[filtroEstado] ?? filtroEstado}` : 'Todos los estados',
      rangoDesde ? `Desde ${rangoDesde}` : null,
      rangoHasta ? `Hasta ${rangoHasta}` : null,
    ].filter(Boolean).join(' · ');

    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(label)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { font-size: 12px; color: #555; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #bbb; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; font-weight: 700; }
  tr:nth-child(even) td { background: #fafafa; }
  .meta { margin-top: 16px; font-size: 10px; color: #888; }
  @media print { body { margin: 0; } }
</style></head>
<body>
  <h1>${escapeHtml(label)}</h1>
  <div class="sub">${escapeHtml(subtitulo)} — ${items.length} registro(s)</div>
  <table>
    <thead><tr>${cabeceras.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="meta">Generado el ${escapeHtml(new Date().toLocaleString('es-ES'))}</div>
</body></html>`;

    const win = window.open('', '_blank');
    if (!win) {
      alert('El navegador ha bloqueado la ventana de impresión. Permite las ventanas emergentes e inténtalo de nuevo.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    // Esperar a que el contenido se renderice antes de abrir el diálogo.
    win.onload = () => win.print();
  }

  if (cargando && lista.length === 0) return <Spinner label={`Cargando ${label.toLowerCase()}…`} />;

  // Búsqueda libre por nombre, matrícula, marca/modelo, dirección o teléfono.
  const q = busqueda.trim().toLowerCase();
  const visibles = q
    ? lista.filter(s => [s.nombre, s.matricula, s.marca_modelo, s.direccion, s.telefono]
        .some(v => (v ?? '').toLowerCase().includes(q)))
    : lista;

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

      {/* Filtro por estado (tags) */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {opcionesFiltro.map(e => (
          <button
            key={e.value}
            className={`btn btn-sm ${filtroEstado === e.value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleFiltro(e.value)}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Búsqueda libre */}
      <input
        className="input"
        type="search"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        placeholder={esTaller ? 'Buscar por matrícula, marca/modelo o nombre…' : 'Buscar por nombre, dirección o teléfono…'}
        style={{ maxWidth: 380 }}
      />

      {/* Barra de impresión por rango de fechas (separada de los tags) */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        flexWrap: 'wrap',
        padding: '12px 14px',
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Desde</label>
          <input
            className="input"
            type="date"
            value={rangoDesde}
            max={rangoHasta || undefined}
            onChange={e => setRangoDesde(e.target.value)}
            style={{ width: 160 }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Hasta</label>
          <input
            className="input"
            type="date"
            value={rangoHasta}
            min={rangoDesde || undefined}
            onChange={e => setRangoHasta(e.target.value)}
            style={{ width: 160 }}
          />
        </div>
        {(rangoDesde || rangoHasta) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setRangoDesde(''); setRangoHasta(''); }}
          >
            Limpiar
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {(rangoDesde || rangoHasta)
              ? 'Imprime los registros del rango'
              : 'Sin fechas: imprime todos los registros'}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={handleImprimir}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Imprimir
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="page-error">{error}</div>}

      {/* Tabla */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {visibles.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>
              {q ? 'Sin coincidencias' : filtroEstado ? `Sin registros en estado "${filtroEstado}"` : `Sin ${label.toLowerCase()} todavía`}
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
                {visibles.map((s: Seguimiento) => (
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