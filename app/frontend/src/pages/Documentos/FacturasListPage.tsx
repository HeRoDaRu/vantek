import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFacturasStore } from '@store/facturas.store';
import Badge from '@ui/Badge';
import Spinner from '@ui/Spinner';

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ESTADOS_FACTURA = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'cerrada', label: 'Cerrada' },
  { value: 'entregada', label: 'Entregada' },
  { value: 'pendiente_pago', label: 'Pendiente de pago' },
  { value: 'pagada', label: 'Pagada' },
];

export default function FacturasListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lista, loading, error, cargarLista } = useFacturasStore();

  // Filtros — se inicializan desde query params si vienen de la ficha de cliente
  const [estado, setEstado]     = useState(searchParams.get('estado') ?? '');
  const [textoBusq, setTextoBusq] = useState(searchParams.get('cliente') ?? '');
  const [trabajoId]             = useState(searchParams.get('trabajo') ?? '');

  // Etiqueta informativa cuando hay filtro de trabajo precargado
  const [trabajoLabel] = useState(() => searchParams.get('trabajo_label') ?? '');

  // Filtro local sobre la lista ya cargada (cliente y agrupador)
  const listaFiltrada = lista.filter(f => {
    if (!textoBusq.trim()) return true;
    const q = textoBusq.toLowerCase();
    return (
      f.cliente_nombre?.toLowerCase().includes(q) ||
      f.agrupador_label?.toLowerCase().includes(q)
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

  if (loading && !lista.length) return <Spinner label="Cargando facturas…" />;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Facturas</h1>
      </div>

      {/* Barra de filtros */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '12px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}
      >
        {/* Chip informativo si viene filtrado por trabajo desde ficha de cliente */}
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
          {ESTADOS_FACTURA.map(e => (
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

      {/* Tabla */}
      {listaFiltrada.length === 0 && !loading ? (
        <div className="empty">
          <span className="empty-title">
            {hayFiltrosActivos ? 'Sin resultados para este filtro' : 'No hay facturas todavía'}
          </span>
          {!hayFiltrosActivos && (
            <span className="empty-desc">Las facturas se crean desde la ficha de cada cliente.</span>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Estado</th>
                <th style={{ width: 90 }}>Número</th>
                <th>Cliente</th>
                <th>Obra / Dirección</th>
                <th style={{ width: 120, textAlign: 'right' }}>Importe</th>
                <th style={{ width: 110 }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map(f => (
                <tr
                  key={f.id}
                  className="row-clickable"
                  onClick={() => navigate(`/facturas/${f.id}`)}
                >
                  <td><Badge estado={f.estado} /></td>
                  <td style={{ fontWeight: 600 }}>{f.numero ?? '—'}</td>
                  <td>{f.cliente_nombre}</td>
                  <td style={{ color: 'var(--text-2)' }}>{f.agrupador_label}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{fmt(f.total)} €</td>
                  <td style={{ color: 'var(--text-2)' }}>{f.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
