import { useEffect, useState } from 'react';
import { api } from '../../../utils/api';
import Modal from '../../../components/UI/Modal';
import Spinner from '../../../components/UI/Spinner';
import { LineaEditor } from './DocumentoEditor';

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface LineaAlbaran {
  id: string;
  descripcion: string;
  cantidad: number;
  unidad: string | null;
  precio_unitario: number; // precio de coste en el albarán
}

interface AlbaranConLineas {
  id: string;
  numero: string | null;
  proveedor_nombre: string | null;
  fecha: string;
  lineas: LineaAlbaran[];
}

interface Props {
  trabajoId: string;
  margenTrabajo: number;   // margen heredado del trabajo
  lineasYaUsadas: string[]; // albaran_linea_id ya presentes en el editor
  onConfirm: (lineas: Omit<LineaEditor, '_key'>[]) => void;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ModalAñadirAlbaran({
  trabajoId,
  margenTrabajo,
  lineasYaUsadas,
  onConfirm,
  onClose,
}: Props) {
  const [albaranes, setAlbaranes] = useState<AlbaranConLineas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set de ids de línea seleccionadas
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());

  // Margen editable por selección — el usuario puede ajustarlo antes de añadir
  const [margen, setMargen] = useState(String(margenTrabajo));

  useEffect(() => {
    async function cargar() {
      try {
        const { data } = await api.get(`/albaranes/trabajo/${trabajoId}`);
        setAlbaranes(data);
      } catch {
        setError('No se pudieron cargar los albaranes del trabajo.');
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, [trabajoId]);

  // ─── Selección ──────────────────────────────────────────────────────────────

  function toggleLinea(lineaId: string) {
    setSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(lineaId)) next.delete(lineaId);
      else next.add(lineaId);
      return next;
    });
  }

  function toggleAlbaran(albaran: AlbaranConLineas) {
    const disponibles = albaran.lineas
      .filter(l => !lineasYaUsadas.includes(l.id))
      .map(l => l.id);

    const todasSeleccionadas = disponibles.every(id => seleccionadas.has(id));

    setSeleccionadas(prev => {
      const next = new Set(prev);
      if (todasSeleccionadas) {
        disponibles.forEach(id => next.delete(id));
      } else {
        disponibles.forEach(id => next.add(id));
      }
      return next;
    });
  }

  // ─── Confirmar ──────────────────────────────────────────────────────────────

  function handleConfirm() {
    const margenNum = Number(margen) || 0;
    const lineasParaAñadir: Omit<LineaEditor, '_key'>[] = [];

    for (const albaran of albaranes) {
      for (const linea of albaran.lineas) {
        if (!seleccionadas.has(linea.id)) continue;
        const coste = linea.precio_unitario;
        const precioFinal = Number(
          (coste * (1 + margenNum / 100)).toFixed(2)
        );
        lineasParaAñadir.push({
          descripcion: linea.descripcion,
          cantidad: linea.cantidad,
          unidad: linea.unidad ?? '',
          precio_unitario: precioFinal,
          coste_unitario: coste,
          margen_porcentaje: margenNum,
          tipo: 'material',
          es_libre: false,
          albaran_linea_id: linea.id,
        });
      }
    }

    onConfirm(lineasParaAñadir);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const totalSeleccionadas = seleccionadas.size;
  const hayAlbaranes = albaranes.length > 0;

  return (
    <Modal
      title="Añadir desde albarán"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            disabled={totalSeleccionadas === 0}
            onClick={handleConfirm}
          >
            Añadir {totalSeleccionadas > 0 ? `(${totalSeleccionadas})` : ''}
          </button>
        </>
      }
    >
      {/* Margen global aplicable a todas las líneas seleccionadas */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px',
        background: 'var(--bg-3)',
        borderRadius: 'var(--radius)',
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 13, color: 'var(--text-2)', flexShrink: 0 }}>
          Margen a aplicar:
        </span>
        <input
          className="input"
          type="number"
          min="0"
          step="1"
          value={margen}
          onChange={e => setMargen(e.target.value)}
          style={{ width: 90 }}
        />
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>%</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>
          El precio final = coste × (1 + margen)
        </span>
      </div>

      {/* Contenido */}
      {loading && <Spinner label="Cargando albaranes…" />}

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {!loading && !error && !hayAlbaranes && (
        <div className="empty-state">
          <p>Este trabajo no tiene albaranes asignados.</p>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>
            Ve a la sección de Albaranes para asignar uno a este trabajo.
          </p>
        </div>
      )}

      {!loading && !error && hayAlbaranes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {albaranes.map(albaran => {
            const disponibles = albaran.lineas.filter(
              l => !lineasYaUsadas.includes(l.id)
            );
            const todasSel = disponibles.length > 0 &&
              disponibles.every(l => seleccionadas.has(l.id));
            const algunaSel = disponibles.some(l => seleccionadas.has(l.id));

            return (
              <div key={albaran.id} style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
              }}>
                {/* Cabecera del albarán */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    background: algunaSel ? 'var(--accent-dim)' : 'var(--bg-3)',
                    cursor: disponibles.length > 0 ? 'pointer' : 'default',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onClick={() => disponibles.length > 0 && toggleAlbaran(albaran)}
                >
                  {/* Checkbox indeterminado cuando solo algunas están sel. */}
                  <input
                    type="checkbox"
                    checked={todasSel}
                    ref={el => {
                      if (el) el.indeterminate = algunaSel && !todasSel;
                    }}
                    onChange={() => {}}
                    onClick={e => e.stopPropagation()}
                    disabled={disponibles.length === 0}
                    style={{ width: 16, height: 16, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {albaran.proveedor_nombre ?? 'Sin proveedor'}
                    </span>
                    {albaran.numero && (
                      <span style={{
                        marginLeft: 8, fontSize: 11,
                        color: 'var(--text-3)',
                        fontFamily: 'monospace',
                      }}>
                        #{albaran.numero}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {albaran.fecha}
                  </span>
                  {disponibles.length === 0 && (
                    <span style={{
                      fontSize: 11, color: 'var(--text-3)',
                      padding: '2px 8px',
                      background: 'var(--bg-4)',
                      borderRadius: 99,
                    }}>
                      Todas añadidas
                    </span>
                  )}
                </div>

                {/* Líneas del albarán */}
                <div>
                  {albaran.lineas.map(linea => {
                    const yaUsada = lineasYaUsadas.includes(linea.id);
                    const sel = seleccionadas.has(linea.id);
                    const margenNum = Number(margen) || 0;
                    const precioFinal = linea.precio_unitario * (1 + margenNum / 100);

                    return (
                      <div
                        key={linea.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 14px',
                          opacity: yaUsada ? 0.4 : 1,
                          cursor: yaUsada ? 'not-allowed' : 'pointer',
                          background: sel ? 'var(--accent-dim)' : 'transparent',
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 100ms',
                        }}
                        onClick={() => !yaUsada && toggleLinea(linea.id)}
                      >
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => {}}
                          disabled={yaUsada}
                          style={{ width: 15, height: 15, flexShrink: 0 }}
                        />

                        {/* Descripción */}
                        <span style={{ flex: 1, fontSize: 13 }}>
                          {linea.descripcion}
                          {yaUsada && (
                            <span style={{
                              marginLeft: 8, fontSize: 11,
                              color: 'var(--text-3)',
                            }}>
                              ya añadida
                            </span>
                          )}
                        </span>

                        {/* Cantidad + unidad */}
                        <span style={{ fontSize: 12, color: 'var(--text-2)', width: 70, textAlign: 'right' }}>
                          {fmt(linea.cantidad)} {linea.unidad ?? ''}
                        </span>

                        {/* Coste (interno) */}
                        <span style={{ fontSize: 12, color: 'var(--text-3)', width: 80, textAlign: 'right' }}>
                          {fmt(linea.precio_unitario)} €
                          <span style={{ fontSize: 10, display: 'block' }}>coste u.</span>
                        </span>

                        {/* Precio final al cliente */}
                        <span style={{
                          fontSize: 13, fontWeight: 600,
                          color: 'var(--text)',
                          width: 90, textAlign: 'right',
                        }}>
                          {fmt(precioFinal)} €
                          <span style={{
                            fontSize: 10, fontWeight: 400,
                            color: 'var(--text-3)', display: 'block',
                          }}>
                            cliente u.
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}