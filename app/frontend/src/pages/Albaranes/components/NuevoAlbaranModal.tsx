import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@ui/Modal';
import api from '@utils/api';

interface LineaNueva {
  _key: string;
  descripcion: string;
  cantidad: string;
  unidad: string;
  precio_unitario: string; // coste en albaranes
}

interface NuevoAlbaranModalProps {
  /** Si se pasa, el albarán se asigna automáticamente a ese trabajo al crear */
  trabajoId?: string;
  onClose: () => void;
  /** Callback opcional si el padre quiere reaccionar sin navegar */
  onCreado?: (albaranId: string) => void;
}

function nuevaLinea(): LineaNueva {
  return {
    _key: Math.random().toString(36).slice(2),
    descripcion: '',
    cantidad: '1',
    unidad: 'ud',
    precio_unitario: '',
  };
}

export default function NuevoAlbaranModal({ trabajoId, onClose, onCreado }: NuevoAlbaranModalProps) {
  const navigate = useNavigate();

  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [proveedor, setProveedor] = useState('');
  const [numero, setNumero] = useState('');
  const [lineas, setLineas] = useState<LineaNueva[]>([nuevaLinea()]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // ─── Gestión de líneas ───────────────────────────────────────────────────

  const actualizarLinea = useCallback((key: string, campo: Partial<Omit<LineaNueva, '_key'>>) => {
    setLineas(prev => prev.map(l => l._key === key ? { ...l, ...campo } : l));
  }, []);

  const añadirLinea = useCallback(() => {
    setLineas(prev => [...prev, nuevaLinea()]);
  }, []);

  const eliminarLinea = useCallback((key: string) => {
    setLineas(prev => prev.filter(l => l._key !== key));
  }, []);

  // ─── Validación ──────────────────────────────────────────────────────────

  const valido = fecha.trim() !== '' &&
    lineas.length > 0 &&
    lineas.every(l => l.descripcion.trim() !== '' && Number(l.cantidad) > 0);

  // ─── Crear albarán ───────────────────────────────────────────────────────

  const handleCrear = useCallback(async () => {
    if (!valido) return;
    setGuardando(true);
    setError('');

    try {
      const body: Record<string, unknown> = {
        fecha,
        proveedor_nombre: proveedor.trim() || undefined,
        numero: numero.trim() || undefined,
        lineas: lineas.map(l => ({
          descripcion: l.descripcion.trim(),
          cantidad: Number(l.cantidad),
          unidad: l.unidad.trim() || null,
          precio_unitario: Number(l.precio_unitario) || 0,
        })),
      };

      // Si viene de FacturaPage, asignar directamente al trabajo
      if (trabajoId) {
        body.trabajo_id = trabajoId;
      }

      const res = await api.post('/albaranes', body);
      const albaranId: string = res.data.data?.id ?? res.data.id;

      onClose();

      if (onCreado) {
        onCreado(albaranId);
      } else {
        navigate(`/albaranes/${albaranId}`);
      }
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message ?? 'Error al crear el albarán');
    } finally {
      setGuardando(false);
    }
  }, [valido, fecha, proveedor, numero, lineas, trabajoId, onClose, onCreado, navigate]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Modal
      title="Nuevo albarán"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={guardando}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCrear}
            disabled={!valido || guardando}
          >
            {guardando ? 'Creando…' : 'Crear albarán'}
          </button>
        </>
      }
    >
      {/* Cabecera del albarán */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div className="form-group">
          <label className="form-label">
            Fecha <span style={{ color: 'var(--accent)' }}>*</span>
          </label>
          <input
            className="input"
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Proveedor</label>
          <input
            className="input"
            value={proveedor}
            onChange={e => setProveedor(e.target.value)}
            placeholder="ej. Leroy Merlin"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Nº albarán</label>
          <input
            className="input"
            value={numero}
            onChange={e => setNumero(e.target.value)}
            placeholder="ej. ALB-2024-001"
          />
        </div>
      </div>

      {trabajoId && (
        <div style={{
          marginBottom: 16,
          padding: '8px 12px',
          background: 'var(--accent-dim)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius)',
          fontSize: 12,
          color: 'var(--accent-h)',
        }}>
          Este albarán se asignará automáticamente al trabajo actual al crearlo.
        </div>
      )}

      {/* Tabla de líneas */}
      <div style={{ marginBottom: 8 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 60px 100px 32px',
          gap: 6,
          padding: '0 0 6px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 6,
        }}>
          <span className="form-label">Descripción *</span>
          <span className="form-label">Cant. *</span>
          <span className="form-label">Ud.</span>
          <span className="form-label">Coste unit. (€)</span>
          <span />
        </div>

        {lineas.map((l, idx) => (
          <div
            key={l._key}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 60px 100px 32px',
              gap: 6,
              marginBottom: 6,
              alignItems: 'center',
            }}
          >
            <input
              className="input input-sm"
              value={l.descripcion}
              onChange={e => actualizarLinea(l._key, { descripcion: e.target.value })}
              placeholder={`Línea ${idx + 1}`}
              autoFocus={idx === lineas.length - 1 && idx > 0}
            />
            <input
              className="input input-sm"
              type="number"
              min="0.01"
              step="0.01"
              value={l.cantidad}
              onChange={e => actualizarLinea(l._key, { cantidad: e.target.value })}
            />
            <input
              className="input input-sm"
              value={l.unidad}
              onChange={e => actualizarLinea(l._key, { unidad: e.target.value })}
              placeholder="ud"
            />
            <input
              className="input input-sm"
              type="number"
              min="0"
              step="0.01"
              value={l.precio_unitario}
              onChange={e => actualizarLinea(l._key, { precio_unitario: e.target.value })}
              placeholder="0.00"
            />
            <button
              className="btn-icon btn-icon-danger"
              title="Eliminar línea"
              onClick={() => eliminarLinea(l._key)}
              disabled={lineas.length === 1}
              style={{ flexShrink: 0 }}
            >
              ✕
            </button>
          </div>
        ))}

        <button
          className="btn btn-ghost btn-sm"
          onClick={añadirLinea}
          style={{ marginTop: 4 }}
        >
          + Añadir línea
        </button>
      </div>

      {error && (
        <div style={{
          marginTop: 12,
          padding: '8px 12px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid var(--red)',
          borderRadius: 'var(--radius)',
          fontSize: 12,
          color: 'var(--red)',
        }}>
          {error}
        </div>
      )}
    </Modal>
  );
}
