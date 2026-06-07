import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@utils/api';
import Badge from '@ui/Badge';
import Spinner from '@ui/Spinner';
import Modal from '@ui/Modal';
import { useConfigStore } from '@store/config.store';

interface LineaAlbaran {
  id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  trabajos_asignados: { id: string; nombre: string }[];
}

interface AlbaranDetalle {
  id: string;
  numero?: string;
  fecha: string;
  estado: 'sin_asignar' | 'parcial' | 'asignado';
  proveedor_id?: string;
  proveedor_nombre?: string;
  notas?: string;
  lineas: LineaAlbaran[];
}

interface TrabajoOpcion {
  id: string;
  nombre: string;
  agrupador_label: string;
  cliente_nombre: string;
}

export default function AlbaranFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useConfigStore();

  const [albaran, setAlbaran]   = useState<AlbaranDetalle | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Modal mover línea
  const [moveLinea, setMoveLinea]         = useState<LineaAlbaran | null>(null);
  const [trabajos, setTrabajos]           = useState<TrabajoOpcion[]>([]);
  const [desdeTrabajoId, setDesdeTrabajo] = useState('');
  const [hastaTrabajoId, setHastaTrabajo] = useState('');
  const [moving, setMoving]               = useState(false);
  const [moveErr, setMoveErr]             = useState('');

  const cargar = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/albaranes/${id}`);
      setAlbaran(res.data.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [id]);

  const abrirMover = async (linea: LineaAlbaran) => {
    setMoveLinea(linea);
    setDesdeTrabajo(linea.trabajos_asignados[0]?.id ?? '');
    setHastaTrabajo('');
    setMoveErr('');
    // Carga la lista de trabajos disponibles (ruta general de clientes anidados no existe,
    // usamos búsqueda de clientes con sus trabajos)
    try {
      const res = await api.get('/clientes', { params: {} });
      const opciones: TrabajoOpcion[] = [];
      for (const c of res.data.data as any[]) {
        const ficha = await api.get(`/clientes/${c.id}`);
        for (const a of ficha.data.data.agrupadores ?? []) {
          for (const tr of a.trabajos ?? []) {
            opciones.push({ id: tr.id, nombre: tr.nombre, agrupador_label: a.label, cliente_nombre: c.nombre });
          }
        }
      }
      setTrabajos(opciones);
    } catch { /* ignorar — el usuario verá la lista vacía */ }
  };

  const handleMover = async () => {
    if (!moveLinea || !desdeTrabajoId || !hastaTrabajoId) {
      setMoveErr('Selecciona el trabajo de origen y destino'); return;
    }
    if (desdeTrabajoId === hastaTrabajoId) {
      setMoveErr('El origen y el destino deben ser distintos'); return;
    }
    setMoving(true);
    setMoveErr('');
    try {
      await api.post(`/albaranes/lineas/${moveLinea.id}/mover`, {
        desde_trabajo_id: desdeTrabajoId,
        hasta_trabajo_id: hastaTrabajoId,
      });
      setMoveLinea(null);
      cargar();
    } catch (e: any) {
      setMoveErr(e.message);
    } finally {
      setMoving(false);
    }
  };

  const formatFecha = (s: string) =>
    new Date(s).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatEuros = (n: number) =>
    n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  if (loading) return <Spinner label="Cargando albarán…" />;

  if (error || !albaran) {
    return (
      <div className="empty">
        <span style={{ color: 'var(--red)' }}>{error ?? 'Albarán no encontrado'}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/albaranes')}>← Volver</button>
      </div>
    );
  }

  const a = albaran;
  const totalLineas = a.lineas.length;
  const lineasAsignadas = a.lineas.filter(l => l.trabajos_asignados.length > 0).length;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col gap-1">
          <div className="breadcrumb">
            <Link to="/albaranes">Albaranes</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{a.numero ?? a.id.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">
              {a.proveedor_nombre ?? 'Sin proveedor'} — {formatFecha(a.fecha)}
            </h1>
            <Badge estado={a.estado} />
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Resumen */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <div className="form-grid form-grid-3" style={{ gap: 16 }}>
              <div>
                <div className="form-label">Líneas asignadas</div>
                <div style={{ color: 'var(--text)', fontWeight: 600 }}>
                  {lineasAsignadas} / {totalLineas}
                </div>
              </div>
              {a.notas && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="form-label">Notas</div>
                  <div className="text-secondary">{a.notas}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de líneas */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Líneas del albarán</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th style={{ textAlign: 'right' }}>Cantidad</th>
                  <th style={{ textAlign: 'right' }}>Precio coste</th>
                  <th>{t('entidades.trabajo')} asignado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {a.lineas.map(linea => {
                  const asignada = linea.trabajos_asignados.length > 0;
                  return (
                    <tr
                      key={linea.id}
                      style={{ opacity: asignada ? 1 : 0.45 }}
                    >
                      <td style={{ color: asignada ? 'var(--text)' : 'var(--text-3)' }}>
                        {linea.descripcion}
                      </td>
                      <td style={{ textAlign: 'right' }} className="mono">{linea.cantidad}</td>
                      <td style={{ textAlign: 'right' }} className="mono">{formatEuros(linea.precio_unitario)}</td>
                      <td>
                        {asignada
                          ? linea.trabajos_asignados.map(tr => (
                            <span
                              key={tr.id}
                              style={{
                                display: 'inline-block',
                                background: 'var(--accent-dim)',
                                color: 'var(--accent)',
                                borderRadius: 'var(--radius)',
                                padding: '1px 8px',
                                fontSize: 12,
                                marginRight: 4,
                              }}
                            >
                              {tr.nombre}
                            </span>
                          ))
                          : <span className="text-muted">Sin asignar</span>
                        }
                      </td>
                      <td>
                        {asignada && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => abrirMover(linea)}
                          >
                            Mover
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal mover línea */}
      <Modal
        open={!!moveLinea}
        onClose={() => setMoveLinea(null)}
        title={`Mover línea a otro ${t('entidades.trabajo').toLowerCase()}`}
        size="sm"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setMoveLinea(null)} disabled={moving}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleMover} disabled={moving}>
              {moving ? 'Moviendo…' : 'Mover'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Línea</label>
            <div style={{ color: 'var(--text)', fontSize: 13 }}>{moveLinea?.descripcion}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Desde {t('entidades.trabajo').toLowerCase()}</label>
            <select
              className="select"
              value={desdeTrabajoId}
              onChange={e => setDesdeTrabajo(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {moveLinea?.trabajos_asignados.map(tr => (
                <option key={tr.id} value={tr.id}>{tr.nombre}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Hasta {t('entidades.trabajo').toLowerCase()}</label>
            <select
              className="select"
              value={hastaTrabajoId}
              onChange={e => setHastaTrabajo(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {trabajos
                .filter(tr => tr.id !== desdeTrabajoId)
                .map(tr => (
                  <option key={tr.id} value={tr.id}>
                    {tr.cliente_nombre} — {tr.agrupador_label} — {tr.nombre}
                  </option>
                ))
              }
            </select>
          </div>
          {moveErr && <span className="form-error">{moveErr}</span>}
        </div>
      </Modal>
    </div>
  );
}