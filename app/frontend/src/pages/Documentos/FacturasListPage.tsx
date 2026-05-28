import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFacturasStore } from '@store/facturas.store';
import Badge from '@ui/Badge';
import Spinner from '@ui/Spinner';

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FacturasListPage() {
  const navigate = useNavigate();
  const { lista, loading, error, cargarLista } = useFacturasStore();

  useEffect(() => { cargarLista(); }, []);

  if (loading && !lista.length) return <Spinner label="Cargando facturas…" />;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Facturas</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {lista.length === 0 ? (
        <div className="empty-state">
          <p>No hay facturas todavía.</p>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>
            Las facturas se crean desde la ficha de cada cliente.
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
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
              {lista.map(f => (
                <tr key={f.id} className="row-clickable"
                  onClick={() => navigate(`/facturas/${f.id}`)}>
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