import { useState } from 'react';
import { EstadoFactura } from '@store/facturas.store';
import { EstadoPresupuesto } from '@store/presupuestos.store';
import Badge from '@ui/Badge';

type TipoDocumento = 'factura' | 'presupuesto';

interface BarraAccionesProps {
  tipo: TipoDocumento;
  estado: EstadoFactura | EstadoPresupuesto;
  numero: string | null;
  guardando: boolean;
  onGuardar: () => void;
  onCerrar: () => void;       // cerrar factura / presupuesto
  onPdf: () => void;
  onEnviar: () => void;
  onImprimir?: () => void;    // solo facturas
  onAlbaranes?: () => void;   // solo facturas
  onHistorial: () => void;
  onReabrir?: () => void;     // reabre como borrador
}

export default function BarraAcciones({
  tipo, estado, numero, guardando,
  onGuardar, onCerrar, onPdf, onEnviar,
  onImprimir, onAlbaranes, onHistorial, onReabrir,
}: BarraAccionesProps) {
  const [confirmReabrir, setConfirmReabrir] = useState(false);
  const esBorrador = estado === 'borrador';

  function handleClickEditar() {
    if (!esBorrador) setConfirmReabrir(true);
  }

  return (
    <>
      <div className="barra-acciones">
        <div className="barra-left">
          <span className="doc-titulo">
            {tipo === 'factura' ? 'Factura' : 'Presupuesto'}
            {numero ? ` #${numero}` : ' — Borrador'}
          </span>
          <Badge estado={estado} />
        </div>

        <div className="barra-right">
          {/* Guardar y Cerrar solo en borrador */}
          <button className="btn btn-ghost btn-sm"
            disabled={!esBorrador || guardando}
            onClick={onGuardar}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>

          <button className="btn btn-primary btn-sm"
            disabled={!esBorrador}
            onClick={esBorrador ? onCerrar : handleClickEditar}>
            {esBorrador
              ? (tipo === 'factura' ? 'Cerrar factura' : 'Cerrar presupuesto')
              : 'Editar (reabrir)'}
          </button>

          <div className="barra-separator" />

          <button className="btn btn-ghost btn-sm" onClick={onPdf}>PDF</button>
          <button className="btn btn-ghost btn-sm" onClick={onEnviar}>Enviar</button>

          {tipo === 'factura' && onImprimir && (
            <button className="btn btn-ghost btn-sm" onClick={onImprimir}>Imprimir</button>
          )}
          {tipo === 'factura' && onAlbaranes && (
            <button className="btn btn-ghost btn-sm" onClick={onAlbaranes}>Albaranes</button>
          )}

          <button className="btn btn-ghost btn-sm" onClick={onHistorial}>Historial</button>
        </div>
      </div>

      {/* Warning reabrir documento ya cerrado */}
      {confirmReabrir && (
        <div className="modal-overlay" onClick={() => setConfirmReabrir(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>¿Reabrir como borrador?</span>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
                El documento volverá a estado borrador. El número de factura se perderá
                y tendrás que cerrarla de nuevo para reasignarlo.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmReabrir(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={() => {
                setConfirmReabrir(false);
                onReabrir?.();
              }}>
                Sí, reabrir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}