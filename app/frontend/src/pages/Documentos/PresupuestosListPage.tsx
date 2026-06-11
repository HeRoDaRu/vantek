import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePresupuestosStore } from '@store/presupuestos.store';
import Badge from '@ui/Badge';
import Spinner from '@ui/Spinner';
import SelectorTrabajoModal from '@ui/SelectorTrabajoModal';

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ESTADOS_PRESUPUESTO = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'aceptado', label: 'Aceptado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'caducado', label: 'Caducado' },
];

export default function PresupuestosListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lista, loading, error, cargarLista, crearPresupuesto } = usePresupuestosStore();

  const [estado, setEstado]       = useState(searchParams.get('estado') ?? '');
  const [textoBusq, setTextoBusq] = useState(searchParams.get('cliente') ?? '');
  const [trabajoId]               = useState(searchParams.get('trabajo') ?? '');
  const [trabajoLabel]            = useState(() => searchParams.get('trabajo_label') ?? '');

  // Modal de nuevo presupuesto
  const [modalNuevo, setModalNuevo] = useState(false);
  const [creando, setCreando]       = useState(false);

  const listaFiltrada = lista.filter(p => {
    if (!textoBusq.trim()) return true;
    const q = textoBusq.toLowerCase();
    return (
      p.cliente_nombre?.toLowerCase().includes(q) ||
      p.agrupador_label?.toLowerCase().includes(q)
    );
  });

  const cargar = useCallback(() => {
    const params: Record<string, string> = {};
    if (estado) params.estado = estado;
    if (trabajoId) params.trabajo_id = trabajoId;
    cargarLista(params);
  }, [estado, trabajoId, cargarLista]);

  useEffect(() => { cargar(); }, [cargar]);

  const limpiarFiltros = () => {
    setEstado('');
    setTextoBusq('');
    setSearchParams({});
    cargarLista({});
  };

  const hayFiltrosActivos = estado || textoBusq || trabajoId;

  async function handleCrearPresupuesto(tId: string) {
    setCreando(true);
    try {
      const nuevo = await crearPresupuesto({ trabajo_id: tId });
      setModalNuevo(false);
      navigate(`/presupuestos/${nuevo.id}`);
    } catch (e: any) {
      alert(`Error al crear el presupuesto: ${e.message}`);
    } finally {
      setCreando(false);
    }
  }

  if (loading && !lista.length) return <Spinner label="Cargando presupuestos…" />;

  return (
    <div className="page">
      <div className="page-header" style={{ paddingTop: 22 }}>
        <h1 className="page-title">Presupuestos</h1>
        <button className="btn btn-primary" onClick={() => setModalNuevo(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo presupuesto
        </button>
      </div>

      {/* Barra de filtros */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '12px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}
      >
        {trabajoId && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px',
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent)',
            borderRadius: 99,
            fontSize: 12,
            color: 'var(--accent-h)',
          }}>
            <span>
              {trabajoLabel ? `Obra: ${trabajoLabel}` : 'Filtrado por obra'}
            </span>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}
              onClick={limpiarFiltros}
              title="Quitar filtro"
            >
              ✕
            </button>
          </div>
        )}

        <select
          className="select"
          style={{ width: 190 }}
          value={estado}
          onChange={e => setEstado(e.target.value)}
        >
          {ESTADOS_PRESUPUESTO.map(e => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>

        <input
          className="input"
          style={{ width: 240 }}
          placeholder="Buscar cliente u obra…"
          value={textoBusq}
          onChange={e => setTextoBusq(e.target.value)}
        />

        {hayFiltrosActivos && !trabajoId && (
          <button className="btn btn-ghost btn-sm" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ margin: '12px 24px' }}>{error}</div>}

      {listaFiltrada.length === 0 && !loading ? (
        <div className="empty">
          <span className="empty-title">
            {hayFiltrosActivos ? 'Sin resultados para este filtro' : 'No hay presupuestos todavía'}
          </span>
          {!hayFiltrosActivos && (
            <span className="empty-desc">
              Usa el botón "Nuevo presupuesto" o créalos desde la ficha de cada cliente.
            </span>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Estado</th>
                <th>Cliente</th>
                <th>Obra / Dirección</th>
                <th style={{ width: 120, textAlign: 'right' }}>Importe est.</th>
                <th style={{ width: 110 }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map(p => (
                <tr
                  key={p.id}
                  className="row-clickable"
                  onClick={() => navigate(`/presupuestos/${p.id}`)}
                >
                  <td><Badge estado={p.estado} /></td>
                  <td>{p.cliente_nombre}</td>
                  <td style={{ color: 'var(--text-2)' }}>{p.agrupador_label}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{fmt(p.importe)} €</td>
                  <td style={{ color: 'var(--text-2)' }}>{p.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SelectorTrabajoModal
        open={modalNuevo}
        onClose={() => setModalNuevo(false)}
        tipo="presupuesto"
        onConfirmar={handleCrearPresupuesto}
        cargando={creando}
      />
    </div>
  );
}