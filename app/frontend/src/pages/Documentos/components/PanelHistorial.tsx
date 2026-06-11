import Modal from '@ui/Modal';

interface Version {
  id: string;
  numero_version: number;
  pdf_path: string;
  created_at: string;
}

interface PanelHistorialProps {
  versiones: Version[];
  documentoId: string;
  tipo: 'factura' | 'presupuesto';
  onClose: () => void;
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PanelHistorial({
  versiones, documentoId, tipo, onClose,
}: PanelHistorialProps) {
  const base = `/api/${tipo === 'factura' ? 'facturas' : 'presupuestos'}`;

  return (
    <Modal title="Historial de versiones" size="md" onClose={onClose}
      footer={<button className="btn btn-ghost" onClick={onClose}>Cerrar</button>}
    >
      {versiones.length === 0 ? (
        <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: 24 }}>
          No hay versiones guardadas todavía.
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Versión</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {versiones.map(v => (
              <tr key={v.id}>
                <td>v{v.numero_version}</td>
                <td>{fmtFecha(v.created_at)}</td>
                <td>
                  
                    href={`${base}/${documentoId}/pdf/latest`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm"
                  <a>
                    Ver PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}