/**
 * ──────────────────────────────────────────────────────────────────────────────
 * pagos.api.ts — Client helpers for the per-obra advance-payment ledger
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Thin async wrappers over /api/trabajos/:trabajoId/pagos used by the obra
 *   form (TrabajoModal → PagosObra) and the seguimiento ficha summary. Errors
 *   surface via the shared axios interceptor (global toast).
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @utils/api → shared axios instance (baseURL '/api')
 *   Used by:
 *     · pages/Clientes/components/Modal/PagosObra.tsx
 *     · pages/Seguimiento/SeguimientoFichaPage.tsx (total summary)
 *
 * EXPORTS
 *   · ObraPagoTipo, ObraPago → types
 *   · listarPagos / crearPago / eliminarPago → REST helpers
 *
 * NOTES
 *   · importe is resolved server-side in euros; for 'porcentaje' it is valor% of
 *     the base the UI passed (the document total the advance was agreed on).
 * ──────────────────────────────────────────────────────────────────────────────
 */

import api from '@utils/api';

export type ObraPagoTipo = 'fijo' | 'porcentaje';

export interface ObraPago {
  id: string;
  trabajo_id: string;
  tipo: ObraPagoTipo;
  valor: number;
  importe: number;
  base: number | null;
  nota: string | null;
  fecha: string;
  created_at: string;
}

export async function listarPagos(trabajoId: string): Promise<{ data: ObraPago[]; total: number }> {
  const res = await api.get(`/trabajos/${trabajoId}/pagos`);
  return res.data;
}

export async function crearPago(
  trabajoId: string,
  body: { tipo: ObraPagoTipo; valor: number; base?: number | null; nota?: string; fecha?: string }
): Promise<ObraPago> {
  const res = await api.post(`/trabajos/${trabajoId}/pagos`, body);
  return res.data.data;
}

export async function eliminarPago(trabajoId: string, pagoId: string): Promise<void> {
  await api.delete(`/trabajos/${trabajoId}/pagos/${pagoId}`);
}
