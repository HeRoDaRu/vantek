/**
 * ──────────────────────────────────────────────────────────────────────────────
 * facturas.service.test.ts — Numbering, albarán→factura transfer & transitions
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  limpiarBd, db, crearCliente, crearAgrupador, crearTrabajo,
  crearAlbaranConLinea, asignarLineaATrabajo,
} from './helpers/db';
import {
  crearFactura, cerrarFactura, cambiarEstado, agregarLineasDesdeAlbaran,
} from '@services/facturas.service';

beforeEach(() => limpiarBd());

function nuevoTrabajo(margen = 20): string {
  return crearTrabajo(crearAgrupador(crearCliente()), { margen });
}

describe('crearFactura', () => {
  it('creates a borrador factura with the default IVA', async () => {
    const trabajoId = nuevoTrabajo();
    const factura = await crearFactura({ trabajo_id: trabajoId });
    expect(factura!.estado).toBe('borrador');
    expect(factura!.numero).toBeNull();
    expect(factura!.iva_porcentaje).toBe(21);
  });
});

describe('cerrarFactura — annual numbering', () => {
  it('assigns padded sequential numbers and rejects re-close', async () => {
    const f1 = await crearFactura({ trabajo_id: nuevoTrabajo() });
    const f2 = await crearFactura({ trabajo_id: nuevoTrabajo() });

    const r1 = await cerrarFactura(f1!.id);
    const r2 = await cerrarFactura(f2!.id);

    expect(r1.ok).toBe(true);
    expect(r1.factura!.numero).toBe('0001');
    expect(r1.factura!.estado).toBe('cerrada');
    expect(r2.factura!.numero).toBe('0002');

    const reclose = await cerrarFactura(f1!.id);
    expect(reclose.ok).toBe(false);
  });
});

describe('agregarLineasDesdeAlbaran', () => {
  it('applies the trabajo margen to the coste and dedups by albaran_linea_id', async () => {
    const trabajoId = nuevoTrabajo(20);
    const { lineaId } = crearAlbaranConLinea({ precio: 100, cantidad: 2 });
    asignarLineaATrabajo(lineaId, trabajoId);

    const r1 = await agregarLineasDesdeAlbaran(trabajoId, [lineaId]);
    expect(r1.agregadas).toBe(1);

    const linea = db().prepare(
      `SELECT precio_unitario, coste_unitario, margen_porcentaje, tipo
       FROM factura_lineas WHERE factura_id = ?`
    ).get(r1.factura_id) as { precio_unitario: number; coste_unitario: number; margen_porcentaje: number; tipo: string };
    expect(linea.coste_unitario).toBe(100);
    expect(linea.precio_unitario).toBe(120); // 100 * (1 + 20/100)
    expect(linea.tipo).toBe('material');

    // Segunda pasada de la misma línea → omitida, no duplica.
    const r2 = await agregarLineasDesdeAlbaran(trabajoId, [lineaId]);
    expect(r2.agregadas).toBe(0);
    expect(r2.omitidas).toBe(1);
  });

  it('ignores lines not assigned to the trabajo', async () => {
    const trabajoId = nuevoTrabajo();
    const { lineaId } = crearAlbaranConLinea(); // not assigned
    const r = await agregarLineasDesdeAlbaran(trabajoId, [lineaId]);
    expect(r.agregadas).toBe(0);
    expect(r.omitidas).toBe(1);
  });
});

describe('cambiarEstado — transition guard', () => {
  it('reopening to borrador clears the number', async () => {
    const f = await crearFactura({ trabajo_id: nuevoTrabajo() });
    await cerrarFactura(f!.id);
    const reabierta = await cambiarEstado(f!.id, 'borrador');
    expect(reabierta!.estado).toBe('borrador');
    expect(reabierta!.numero).toBeNull();
    expect(reabierta!.anio_numero).toBeNull();
  });

  it('does not move a pagada factura backward to entregada (no error)', async () => {
    const f = await crearFactura({ trabajo_id: nuevoTrabajo() });
    await cerrarFactura(f!.id);
    await cambiarEstado(f!.id, 'pagada');

    const result = await cambiarEstado(f!.id, 'entregada');
    expect(result!.estado).toBe('pagada');
  });
});
