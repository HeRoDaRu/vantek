/**
 * ──────────────────────────────────────────────────────────────────────────────
 * pagos.service.test.ts — Per-obra advance-payment ledger
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { limpiarBd, crearCliente, crearAgrupador, crearTrabajo } from './helpers/db';
import { crearPago, listarPagos, totalPagos, eliminarPago } from '@services/pagos.service';

function nuevaObra(): string {
  const cliente = crearCliente();
  const agrupador = crearAgrupador(cliente);
  return crearTrabajo(agrupador);
}

describe('pagos.service', () => {
  beforeEach(() => limpiarBd());

  it('stores a fixed payment as its euro amount', () => {
    const trabajo = nuevaObra();
    const pago = crearPago(trabajo, { tipo: 'fijo', valor: 500 });
    expect(pago.importe).toBe(500);
    expect(pago.base).toBeNull();
    expect(totalPagos(trabajo)).toBe(500);
  });

  it('resolves a percentage payment against the base', () => {
    const trabajo = nuevaObra();
    const pago = crearPago(trabajo, { tipo: 'porcentaje', valor: 40, base: 1000 });
    expect(pago.importe).toBe(400);
    expect(pago.base).toBe(1000);
  });

  it('accumulates several partial payments in the ledger total', () => {
    const trabajo = nuevaObra();
    crearPago(trabajo, { tipo: 'fijo', valor: 300 });
    crearPago(trabajo, { tipo: 'porcentaje', valor: 10, base: 2000 }); // 200
    expect(listarPagos(trabajo)).toHaveLength(2);
    expect(totalPagos(trabajo)).toBe(500);
  });

  it('deletes a payment and updates the total', () => {
    const trabajo = nuevaObra();
    const pago = crearPago(trabajo, { tipo: 'fijo', valor: 250 });
    expect(eliminarPago(trabajo, pago.id)).toBe(true);
    expect(totalPagos(trabajo)).toBe(0);
    expect(eliminarPago(trabajo, pago.id)).toBe(false);
  });

  it('rejects a payment on an unknown obra with a 404 status code', () => {
    try {
      crearPago('no-existe', { tipo: 'fijo', valor: 100 });
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.statusCode).toBe(404);
    }
  });
});
