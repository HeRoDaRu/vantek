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
  onCerrar: () => void;
  onPdf: () => void;
  onEnviar: () => void;
  onImprimir?: () => void;
  onAlbaranes?: () => void;
  onHistorial: () => void;
  onReabrir?: () => void;
  onEliminar?: () => void;
  // Para presupuesto aceptado: convertir a factura
  onConvertirFactura?: () => void;
}

export default function BarraAcciones({
  tipo, estado, numero, guardando,
  onGuardar, onCerrar, onPdf, onEnviar,
  onImprimir, onAlbaranes, onHistorial, onReabrir, onEliminar,
  onConvertirFactura,
}: BarraAccionesProps) {
  const [confirmReabrir, setConfirmReabrir] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const esBorrador = estado === 'borrador';
  const esAceptado = estado === 'aceptado';

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
          {/* Guardar: solo en borrador */}
          <button
            className="btn btn-ghost btn-sm"
            disabled={!esBorrador || guardando}
            onClick={onGuardar}
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>

          {/* Cerrar: solo en borrador */}
          {esBorrador && (
            <button className="btn btn-primary btn-sm" onClick={onCerrar}>
              {tipo === 'factura' ? 'Cerrar factura' : 'Cerrar presupuesto'}
            </button>
          )}

          {/* Editar (reabrir): cuando no está en borrador */}
          {!esBorrador && onReabrir && (
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmReabrir(true)}>
              Editar (reabrir)
            </button>
          )}

          {/* Convertir a factura: solo en presupuesto aceptado */}
          {tipo === 'presupuesto' && esAceptado && onConvertirFactura && (
            <button className="btn btn-primary btn-sm" onClick={onConvertirFactura}>
              → Crear factura
            </button>
          )}

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

          {esBorrador && onEliminar && (
            <button className="btn btn-ghost btn-icon-danger btn-sm" onClick={() => setConfirmEliminar(true)}>
              Eliminar
            </button>
          )}
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
                El documento volverá a estado borrador.
                {tipo === 'factura' && ' El número de factura se perderá y tendrás que cerrarla de nuevo para reasignarlo.'}
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

      {/* Confirmar eliminación */}
      {confirmEliminar && (
        <div className="modal-overlay" onClick={() => setConfirmEliminar(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>¿Eliminar borrador?</span>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
                Esta acción no se puede deshacer. El borrador se eliminará permanentemente.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmEliminar(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={() => {
                setConfirmEliminar(false);
                onEliminar?.();
              }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}