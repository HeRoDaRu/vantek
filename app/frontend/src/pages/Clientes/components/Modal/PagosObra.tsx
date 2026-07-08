/**
 * ──────────────────────────────────────────────────────────────────────────────
 * PagosObra.tsx — Advance-payment (anticipos) ledger panel for an obra
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Lists, adds and deletes the advance payments a cliente hands over for an
 *   obra (trabajo). Supports a single upfront payment or several partial ones,
 *   each entered as a fixed € amount or a percentage of a base total. Shows the
 *   running total handed over so far. Persists immediately via pagos.api.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @utils/pagos.api (listarPagos/crearPago/eliminarPago, ObraPago) → REST
 *   Used by:
 *     · pages/Clientes/components/Modal/TrabajoModal.tsx (only when editing an
 *       existing obra, since payments need a persisted trabajo id)
 *
 * PROPS
 *   · trabajoId: string → the obra whose ledger is shown
 *   · onTotalChange?: (total: number) => void → notify parent of the new total
 *
 * INPUTS / OUTPUTS
 *   Input:  user-entered payments (tipo/valor[/base/nota/fecha])
 *   Output: obra_pagos rows created/deleted; running total rendered
 *
 * NOTES
 *   · For 'porcentaje' the user provides the base (the quote/invoice total the
 *     % was agreed on); the resolved euros are computed by the backend.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import { listarPagos, crearPago, eliminarPago, ObraPago, ObraPagoTipo } from '@utils/pagos.api';

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  trabajoId: string;
  onTotalChange?: (total: number) => void;
}

export default function PagosObra({ trabajoId, onTotalChange }: Props) {
  const [pagos, setPagos] = useState<ObraPago[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);

  const [tipo, setTipo] = useState<ObraPagoTipo>('fijo');
  const [valor, setValor] = useState('');
  const [base, setBase] = useState('');
  const [nota, setNota] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [guardando, setGuardando] = useState(false);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await listarPagos(trabajoId);
      setPagos(res.data);
      setTotal(res.total);
      onTotalChange?.(res.total);
    } finally {
      setCargando(false);
    }
  }, [trabajoId, onTotalChange]);

  useEffect(() => { recargar(); }, [recargar]);

  const importePreview =
    tipo === 'porcentaje'
      ? ((Number(valor) || 0) / 100) * (Number(base) || 0)
      : (Number(valor) || 0);

  const puedeAñadir = (Number(valor) || 0) > 0 && (tipo === 'fijo' || (Number(base) || 0) > 0);

  const handleAñadir = async () => {
    if (!puedeAñadir) return;
    setGuardando(true);
    try {
      await crearPago(trabajoId, {
        tipo,
        valor: Number(valor) || 0,
        base: tipo === 'porcentaje' ? (Number(base) || 0) : null,
        nota: nota.trim() || undefined,
        fecha,
      });
      setValor('');
      setBase('');
      setNota('');
      await recargar();
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (pagoId: string) => {
    await eliminarPago(trabajoId, pagoId);
    await recargar();
  };

  return (
    <div className="form-group" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
      <label className="form-label">
        Anticipos / pagos entregados
        <span className="text-muted" style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
          — dinero que el cliente adelanta para esta obra
        </span>
      </label>

      {cargando ? (
        <div className="text-muted" style={{ fontSize: 13 }}>Cargando…</div>
      ) : pagos.length === 0 ? (
        <div className="text-muted" style={{ fontSize: 13 }}>Sin anticipos registrados.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
          {pagos.map(p => (
            <div
              key={p.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'max-content 1fr max-content max-content',
                gap: 8, alignItems: 'center',
                fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)',
              }}
            >
              <span className="text-muted">{p.fecha}</span>
              <span>
                {p.tipo === 'porcentaje'
                  ? `${p.valor}% de ${fmt(p.base ?? 0)} €`
                  : 'Importe fijo'}
                {p.nota ? <span className="text-muted"> — {p.nota}</span> : null}
              </span>
              <strong>{fmt(p.importe)} €</strong>
              <button
                className="btn-icon btn-icon-danger"
                title="Eliminar"
                onClick={() => handleEliminar(p.id)}
              >✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, fontWeight: 700 }}>
            <span>Total anticipado</span>
            <span>{fmt(total)} €</span>
          </div>
        </div>
      )}

      {/* Alta de anticipo */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button
          type="button"
          className={`btn btn-sm ${tipo === 'fijo' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTipo('fijo')}
        >€ fijo</button>
        <button
          type="button"
          className={`btn btn-sm ${tipo === 'porcentaje' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTipo('porcentaje')}
        >% del total</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: tipo === 'porcentaje' ? '1fr 1fr' : '1fr', gap: 8, marginTop: 8 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{tipo === 'porcentaje' ? 'Porcentaje (%)' : 'Importe (€)'}</label>
          <input
            className="input"
            type="number" min="0" step="0.01"
            value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder={tipo === 'porcentaje' ? 'ej. 40' : 'ej. 500'}
          />
        </div>
        {tipo === 'porcentaje' && (
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Sobre importe (€)</label>
            <input
              className="input"
              type="number" min="0" step="0.01"
              value={base}
              onChange={e => setBase(e.target.value)}
              placeholder="total del presupuesto"
            />
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Fecha</label>
          <input className="input" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Nota (opcional)</label>
          <input className="input" value={nota} onChange={e => setNota(e.target.value)} placeholder="ej. entrega inicial" />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span className="text-muted" style={{ fontSize: 13 }}>
          {puedeAñadir ? <>Se registrará: <strong style={{ color: 'var(--text)' }}>{fmt(importePreview)} €</strong></> : 'Introduce el importe'}
        </span>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleAñadir}
          disabled={!puedeAñadir || guardando}
        >
          {guardando ? 'Añadiendo…' : 'Añadir anticipo'}
        </button>
      </div>
    </div>
  );
}
