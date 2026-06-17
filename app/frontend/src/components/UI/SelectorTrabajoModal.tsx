/**
 * ──────────────────────────────────────────────────────────────────────────────
 * SelectorTrabajoModal.tsx — Cascading cliente → agrupador → trabajo picker
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Modal used when creating a new presupuesto/factura. Step 1 searches clientes
 *   (debounced 300ms); step 2 lists the chosen client's agrupadores (obras);
 *   step 3 picks an active trabajo. A breadcrumb shows context and the footer
 *   confirms with the selected trabajo id.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @ui/Modal → dialog shell (title/footer/size)
 *     · @utils/api → axios client (GET /clientes, GET /clientes/:id)
 *   Used by:
 *     · FacturasListPage / PresupuestosListPage ("Nueva factura/presupuesto")
 *
 * PROPS
 *   · open: boolean → modal visibility (resets internal state on close)
 *   · onClose: () => void → dismiss without selecting
 *   · tipo: 'presupuesto' | 'factura' → drives title and confirm button text
 *   · onConfirmar: (trabajoId: string) => void → called with the chosen trabajo id
 *   · cargando?: boolean → disables actions / shows "Creando…" while parent works
 *
 * INPUTS / OUTPUTS
 *   Input:  open/tipo/cargando props + user search & selections
 *   Output: onConfirmar(trabajoId) on confirm; onClose on cancel
 *
 * NOTES
 *   · Client search is debounced 300ms via debounceRef; empty query clears results.
 *   · Cancelled trabajos are filtered out of the selectable list.
 *   · State (cliente/agrupador/trabajo) resets whenever open becomes false.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';
import Modal from '@ui/Modal';
import api from '@utils/api';

interface TrabajoBrief {
  id: string;
  nombre: string;
  estado: string;
}

interface AgrupadorBrief {
  id: string;
  label: string;
  descripcion?: string;
  trabajos?: TrabajoBrief[];
}

interface ClienteBrief {
  id: string;
  nombre: string;
  empresa?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tipo: 'presupuesto' | 'factura';
  onConfirmar: (trabajoId: string) => void;
  cargando?: boolean;
}

export default function SelectorTrabajoModal({ open, onClose, tipo, onConfirmar, cargando }: Props) {
  const titulo = tipo === 'presupuesto' ? 'Nuevo presupuesto' : 'Nueva factura';

  const [busqueda, setBusqueda]               = useState('');
  const [clientes, setClientes]               = useState<ClienteBrief[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteBrief | null>(null);

  const [agrupadores, setAgrupadores]         = useState<AgrupadorBrief[]>([]);
  const [cargandoAgrup, setCargandoAgrup]     = useState(false);
  const [agrupadorSeleccionado, setAgrupadorSeleccionado] = useState<AgrupadorBrief | null>(null);

  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState<TrabajoBrief | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setBusqueda('');
      setClientes([]);
      setClienteSeleccionado(null);
      setAgrupadores([]);
      setAgrupadorSeleccionado(null);
      setTrabajoSeleccionado(null);
    }
  }, [open]);

  // Búsqueda de clientes con debounce
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!busqueda.trim()) { setClientes([]); return; }
      setCargandoClientes(true);
      try {
        const res = await api.get('/clientes', { params: { search: busqueda } });
        setClientes(res.data.data ?? []);
      } catch {
        setClientes([]);
      } finally {
        setCargandoClientes(false);
      }
    }, 300);
  }, [busqueda, open]);

  async function elegirCliente(cliente: ClienteBrief) {
    setClienteSeleccionado(cliente);
    setBusqueda('');
    setClientes([]);
    setAgrupadorSeleccionado(null);
    setTrabajoSeleccionado(null);
    setCargandoAgrup(true);
    try {
      const res = await api.get(`/clientes/${cliente.id}`);
      setAgrupadores(res.data.data?.agrupadores ?? []);
    } catch {
      setAgrupadores([]);
    } finally {
      setCargandoAgrup(false);
    }
  }

  function volver() {
    if (agrupadorSeleccionado) {
      setAgrupadorSeleccionado(null);
      setTrabajoSeleccionado(null);
    } else {
      setClienteSeleccionado(null);
      setAgrupadores([]);
    }
  }

  const trabajosFiltrados = agrupadorSeleccionado?.trabajos?.filter(t => t.estado !== 'cancelado') ?? [];
  const puedoConfirmar = !!trabajoSeleccionado && !cargando;

  // ── Estilo compartido para filas de selección ──
  const sRowBase: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    width: '100%', padding: '10px 12px', textAlign: 'left',
    background: 'var(--bg-3)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', cursor: 'pointer',
    transition: 'all 150ms ease', gap: 2,
  };
  const sRowHover: React.CSSProperties = {
    ...sRowBase,
    borderColor: 'var(--border-2)', background: 'var(--bg-4)',
  };
  const sRowSelected: React.CSSProperties = {
    ...sRowBase,
    borderColor: 'var(--accent)', background: 'var(--accent-dim)',
  };

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
      <button
        className="btn btn-ghost"
        onClick={clienteSeleccionado ? volver : onClose}
        disabled={cargando}
      >
        {clienteSeleccionado ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Atrás
          </>
        ) : 'Cancelar'}
      </button>
      <button
        className="btn btn-primary"
        disabled={!puedoConfirmar}
        onClick={() => trabajoSeleccionado && onConfirmar(trabajoSeleccionado.id)}
      >
        {cargando ? 'Creando…' : `Crear ${tipo}`}
      </button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={titulo} size="md" footer={footer}>

      {/* Breadcrumb de contexto */}
      {clienteSeleccionado && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          padding: '8px 12px', background: 'var(--bg-3)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          fontSize: 12, color: 'var(--text-2)',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>
            {clienteSeleccionado.empresa || clienteSeleccionado.nombre}
          </span>
          {agrupadorSeleccionado && (
            <>
              <span style={{ color: 'var(--text-3)' }}>›</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                {agrupadorSeleccionado.label}
              </span>
            </>
          )}
        </div>
      )}

      {/* ── PASO 1: buscar cliente ── */}
      {!clienteSeleccionado && (
        <div className="form-group">
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>
            Busca el cliente para el que quieres crear el {tipo}
          </span>
          <input
            className="input"
            placeholder="Nombre del cliente…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            autoFocus
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {cargandoClientes && (
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Buscando…</span>
            )}
            {!cargandoClientes && clientes.map(c => (
              <button
                key={c.id}
                style={sRowBase}
                onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, sRowHover)}
                onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, sRowBase)}
                onClick={() => elegirCliente(c)}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {c.nombre}
                </span>
                {c.empresa && (
                  <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{c.empresa}</span>
                )}
              </button>
            ))}
            {!cargandoClientes && busqueda.trim() && clientes.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Sin resultados para "{busqueda}"
              </span>
            )}
            {!busqueda.trim() && (
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Escribe al menos una letra para buscar
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── PASO 2: elegir agrupador ── */}
      {clienteSeleccionado && !agrupadorSeleccionado && (
        <div className="form-group">
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>
            Selecciona la dirección / obra
          </span>
          {cargandoAgrup && (
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Cargando…</span>
          )}
          {!cargandoAgrup && agrupadores.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Este cliente no tiene direcciones. Créalas primero desde su ficha.
            </span>
          )}
          {!cargandoAgrup && agrupadores.map(a => (
            <button
              key={a.id}
              style={sRowBase}
              onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, sRowHover)}
              onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, sRowBase)}
              onClick={() => { setAgrupadorSeleccionado(a); setTrabajoSeleccionado(null); }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.label}</span>
              {a.descripcion && (
                <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{a.descripcion}</span>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {a.trabajos?.filter(t => t.estado !== 'cancelado').length ?? 0} obra(s) activa(s)
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── PASO 3: elegir trabajo ── */}
      {clienteSeleccionado && agrupadorSeleccionado && (
        <div className="form-group">
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>
            Selecciona la obra / trabajo
          </span>
          {trabajosFiltrados.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Esta dirección no tiene obras activas. Créalas desde la ficha del cliente.
            </span>
          )}
          {trabajosFiltrados.map(t => (
            <button
              key={t.id}
              style={trabajoSeleccionado?.id === t.id ? sRowSelected : sRowBase}
              onMouseEnter={e => {
                if (trabajoSeleccionado?.id !== t.id)
                  Object.assign((e.currentTarget as HTMLElement).style, sRowHover);
              }}
              onMouseLeave={e => {
                if (trabajoSeleccionado?.id !== t.id)
                  Object.assign((e.currentTarget as HTMLElement).style, sRowBase);
              }}
              onClick={() => setTrabajoSeleccionado(t)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.nombre}</span>
                {trabajoSeleccionado?.id === t.id && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.estado}</span>
            </button>
          ))}
        </div>
      )}

    </Modal>
  );
}