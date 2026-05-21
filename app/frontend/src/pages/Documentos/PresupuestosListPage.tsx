import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePresupuestosStore } from '../../store/presupuestos.store';
import Badge from '../../components/UI/Badge';
import Spinner from '../../components/UI/Spinner';

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PresupuestosListPage() {
  const navigate = useNavigate();
  const { lista, loading, error, cargarLista } = usePresupuestosStore();

  useEffect(() => { cargarLista(); }, []);

  if (loading && !lista.length) return <Spinner label="Cargando presupuestos…" />;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Presupuestos</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {lista.length === 0 ? (
        <div className="empty-state">
          <p>No hay presupuestos todavía.</p>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>
            Los presupuestos se crean desde la ficha de cada cliente.
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
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
              {lista.map(p => (
                <tr key={p.id} className="row-clickable"
                  onClick={() => navigate(`/presupuestos/${p.id}`)}>
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
    </div>
  );
}