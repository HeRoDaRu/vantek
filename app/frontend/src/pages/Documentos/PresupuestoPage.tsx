import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePresupuestosStore, LineaPresupuesto, EstadoPresupuesto } from '@store/presupuestos.store';
import Spinner from '@ui/Spinner';
import Modal from '@ui/Modal';
import DocumentoEditor, { LineaEditor } from '@pages/Documentos/components/DocumentoEditor';
import BarraAcciones from '@pages/Documentos/components/BarraAcciones';
import PanelHistorial from '@pages/Documentos/components/PanelHistorial';

const AUTOSAVE_MS = 3 * 60 * 1000;

export default function PresupuestoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { actual, loading, error, cargarPresupuesto, guardarLineas,
          guardarBorrador, cambiarEstado, generarPdf } = usePresupuestosStore();

  const [lineasEditor, setLineasEditor] = useState<LineaEditor[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showEnviar, setShowEnviar] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);

  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (id) cargarPresupuesto(id);
    return () => { if (autosaveTimer.current) clearInterval(autosaveTimer.current); };
  }, [id]);

  useEffect(() => {
    if (!actual || !id || actual.estado !== 'borrador') return;
    autosaveTimer.current = setInterval(() => {
      guardarBorrador(id, { lineas: lineasEditor });
    }, AUTOSAVE_MS);
    return () => { if (autosaveTimer.current) clearInterval(autosaveTimer.current); };
  }, [actual?.id, actual?.estado]);

  const handleGuardar = useCallback(async () => {
    if (!id || !actual) return;
    setGuardando(true);
    try {
      const lineasBack = lineasEditor.map(l => ({
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        unidad: l.unidad || null,
        precio_unitario: l.precio_unitario,
        coste_unitario: l.coste_unitario,
        margen_porcentaje: l.margen_porcentaje,
        tipo: l.tipo,
      } as Omit<LineaPresupuesto, 'id' | 'presupuesto_id' | 'orden'>));
      await guardarLineas(id, lineasBack);
      await generarPdf(id);
    } finally {
      setGuardando(false);
    }
  }, [id, lineasEditor]);

  const handleCerrar = useCallback(async () => {
    if (!id) return;
    // Verificación: al menos una línea
    if (lineasEditor.length === 0) {
      setErrorCierre('El presupuesto debe tener al menos una línea antes de cerrarse.');
      return;
    }
    await handleGuardar();
    await cambiarEstado(id, 'enviado');
  }, [id, lineasEditor, handleGuardar, cambiarEstado]);

  const handlePdf = useCallback(async () => {
    if (!id) return;
    await generarPdf(id);
    window.open(`/api/presupuestos/${id}/pdf/latest`, '_blank');
  }, [id]);

  const handleReabrir = useCallback(async () => {
    if (!id) return;
    await cambiarEstado(id, 'borrador');
  }, [id, cambiarEstado]);

  if (loading && !actual) return <Spinner label="Cargando presupuesto…" />;
  if (error) return <div className="page-error">{error}</div>;
  if (!actual) return null;

  const readonly = actual.estado !== 'borrador';

  return (
    <div className="page">

      <div className="breadcrumb">
        <button className="btn-link" onClick={() => navigate(-1)}>← Volver</button>
        <span>{actual.cliente_nombre}</span>
        <span>›</span>
        <span>{actual.agrupador_label}</span>
        <span>›</span>
        <span>{actual.trabajo_nombre}</span>
        <span>›</span>
        <span>Presupuesto {actual.numero ?? 'Borrador'}</span>
      </div>

      <BarraAcciones
        tipo="presupuesto"
        estado={actual.estado}
        numero={actual.numero}
        guardando={guardando}
        onGuardar={handleGuardar}
        onCerrar={handleCerrar}
        onPdf={handlePdf}
        onEnviar={() => setShowEnviar(true)}
        onHistorial={() => setShowHistorial(true)}
        onReabrir={handleReabrir}
      />

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div className="form-label">Cliente</div>
            <div style={{ fontWeight: 600 }}>{actual.cliente_nombre}</div>
          </div>
          <div>
            <div className="form-label">Dirección / Obra</div>
            <div style={{ color: 'var(--text-2)' }}>{actual.agrupador_label}</div>
          </div>
          <div>
            <div className="form-label">Fecha</div>
            <div>{actual.fecha}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <DocumentoEditor
          tipo="presupuesto"
          trabajoId={actual.trabajo_id}
          lineasIniciales={actual.lineas}
          iva_porcentaje={actual.iva_porcentaje}
          readonly={readonly}
          onChange={setLineasEditor}
        />
      </div>

      {errorCierre && (
        <Modal title="No se puede cerrar" size="sm" onClose={() => setErrorCierre(null)}
          footer={<button className="btn btn-primary" onClick={() => setErrorCierre(null)}>Entendido</button>}
        >
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>{errorCierre}</p>
        </Modal>
      )}

      {showEnviar && (
        <Modal title="Marcar como enviado" size="sm" onClose={() => setShowEnviar(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowEnviar(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={async () => {
                if (id) { await cambiarEstado(id, 'enviado'); setShowEnviar(false); }
              }}>
                Confirmar
              </button>
            </>
          }
        >
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
            ¿Confirmas que el presupuesto ha sido entregado al cliente?
            El estado cambiará a «Enviado».
          </p>
        </Modal>
      )}

      {showHistorial && (
        <PanelHistorial
          versiones={actual.versiones}
          documentoId={actual.id}
          tipo="presupuesto"
          onClose={() => setShowHistorial(false)}
        />
      )}
    </div>
  );
}