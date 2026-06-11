import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@utils/api';
import Badge from '@ui/Badge';
import Spinner from '@ui/Spinner';
import { useConfigStore } from '@store/config.store';
import NuevoAlbaranModal from './components/NuevoAlbaranModal';

interface AlbaranListItem {
  id: string;
  numero?: string;
  proveedor_id?: string;
  proveedor_nombre?: string;
  fecha: string;
  estado: 'sin_asignar' | 'parcial' | 'asignado';
  total_lineas: number;
  trabajo_id?: string;
  trabajo_nombre?: string;
  agrupador_label?: string;
  cliente_nombre?: string;
}

export default function AlbaranesPage() {
  const navigate = useNavigate();
  const { t } = useConfigStore();

  const [albaranes, setAlbaranes] = useState<AlbaranListItem[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [showNuevo, setShowNuevo] = useState(false);

  // Filtros
  const [estado, setEstado]         = useState('');
  const [proveedor, setProveedor]   = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (estado)     params.estado       = estado;
      if (proveedor)  params.proveedor    = proveedor;
      if (fechaDesde) params.fecha_desde  = fechaDesde;
      if (fechaHasta) params.fecha_hasta  = fechaHasta;
      const res = await api.get('/albaranes', { params });
      setAlbaranes(res.data.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [estado, fechaDesde, fechaHasta]);

  const handleProveedorBlur = () => cargar();

  const formatFecha = (s: string) =>
    new Date(s).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ paddingTop: 22 }}>
        <h1 className="page-title">Albaranes</h1>
        <button className="btn btn-primary" onClick={() => setShowNuevo(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>Nuevo albarán
        </button>
      </div>

      {/* Filtros */}
      <div
        className="flex items-center gap-2"
        style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}
      >
        <select className="select" style={{ width: 160 }} value={estado} onChange={e => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="sin_asignar">Sin asignar</option>
          <option value="parcial">Parcial</option>
          <option value="asignado">Asignado</option>
        </select>

        <input
          className="input"
          style={{ width: 200 }}
          placeholder="Proveedor…"
          value={proveedor}
          onChange={e => setProveedor(e.target.value)}
          onBlur={handleProveedorBlur}
          onKeyDown={e => e.key === 'Enter' && cargar()}
        />

        <div className="flex items-center gap-2">
          <label className="form-label" style={{ whiteSpace: 'nowrap' }}>Desde</label>
          <input className="input" type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="form-label" style={{ whiteSpace: 'nowrap' }}>Hasta</label>
          <input className="input" type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
        </div>

        {(estado || proveedor || fechaDesde || fechaHasta) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setEstado(''); setProveedor(''); setFechaDesde(''); setFechaHasta(''); }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Body */}
      <div className="page-body-flush">
        {loading && <Spinner label="Cargando albaranes…" />}

        {error && <div className="empty"><span style={{ color: 'var(--red)' }}>{error}</span></div>}

        {!loading && !error && albaranes.length === 0 && (
          <div className="empty">
            <span className="empty-title">No hay albaranes</span>
            <span className="empty-desc">Crea el primero con el botón «+ Nuevo albarán».</span>
          </div>
        )}

        {!loading && !error && albaranes.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Proveedor</th>
                  <th>Nº albarán</th>
                  <th>Fecha</th>
                  <th>{t('entidades.trabajo')}</th>
                  <th style={{ textAlign: 'right' }}>Líneas</th>
                </tr>
              </thead>
              <tbody>
                {albaranes.map(a => (
                  <tr key={`${a.id}-${a.trabajo_id ?? 'none'}`} onClick={() => navigate(`/albaranes/${a.id}`)}>
                    <td><Badge estado={a.estado} /></td>
                    <td>{a.proveedor_nombre ?? <span className="text-muted">—</span>}</td>
                    <td className="mono">{a.numero ?? <span className="text-muted">—</span>}</td>
                    <td>{formatFecha(a.fecha)}</td>
                    <td>
                      {a.trabajo_nombre
                        ? (
                          <div>
                            <span style={{ color: 'var(--text)' }}>{a.trabajo_nombre}</span>
                            {a.agrupador_label && (
                              <span className="text-muted text-xs" style={{ marginLeft: 6 }}>
                                {a.agrupador_label}
                              </span>
                            )}
                          </div>
                        )
                        : <span className="text-muted">Sin asignar</span>
                      }
                    </td>
                    <td style={{ textAlign: 'right' }} className="mono">{a.total_lineas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nuevo albarán */}
      {showNuevo && (
        <NuevoAlbaranModal
          onClose={() => setShowNuevo(false)}
          onCreado={albaranId => {
            setShowNuevo(false);
            navigate(`/albaranes/${albaranId}`);
          }}
        />
      )}
    </div>
  );
}
