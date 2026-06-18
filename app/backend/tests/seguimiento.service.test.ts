/**
 * ──────────────────────────────────────────────────────────────────────────────
 * seguimiento.service.test.ts — Dedup, state machine & document sync
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Exercises the highest-value business logic of seguimiento.service: fuzzy
 *   client/agrupador deduplication on auto-conversion, the cancellation rules,
 *   the entregada PDF guard, and the forward-only document → seguimiento sync.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { limpiarBd, db } from './helpers/db';
import {
  crear,
  cambiarEstado,
  obtener,
  syncSeguimientoDesdeDocumento,
} from '@services/seguimiento.service';

beforeEach(() => limpiarBd());

function contarClientesActivos(): number {
  return (db().prepare('SELECT COUNT(*) AS n FROM clientes WHERE activo = 1').get() as { n: number }).n;
}
function contarAgrupadores(clienteId?: string): number {
  if (clienteId) {
    return (db().prepare('SELECT COUNT(*) AS n FROM agrupadores WHERE cliente_id = ? AND activo = 1').get(clienteId) as { n: number }).n;
  }
  return (db().prepare('SELECT COUNT(*) AS n FROM agrupadores WHERE activo = 1').get() as { n: number }).n;
}

describe('auto-conversion + deduplication', () => {
  it('creates cliente + agrupador + trabajo when reaching pendiente_presupuesto', () => {
    const seg = crear({ nombre: 'Ana López', telefono: '600111222', direccion: 'Calle Mayor 1', peticion: 'Reforma baño' });
    expect(seg.trabajo_id).toBeNull();

    const actualizado = cambiarEstado(seg.id, 'pendiente_presupuesto');

    expect(actualizado.estado).toBe('pendiente_presupuesto');
    expect(actualizado.trabajo_id).not.toBeNull();
    expect(contarClientesActivos()).toBe(1);
    expect(contarAgrupadores()).toBe(1);
  });

  it('reuses the cliente when DNI/CIF matches exactly (different addresses → 2 agrupadores)', () => {
    const a = crear({ nombre: 'Empresa SL', dni_cif: 'B12345678', direccion: 'Polígono Industrial Norte 14' });
    cambiarEstado(a.id, 'pendiente_presupuesto');
    const b = crear({ nombre: 'Empresa SL', dni_cif: 'B12345678', direccion: 'Avenida del Sol 25' });
    cambiarEstado(b.id, 'pendiente_presupuesto');

    expect(contarClientesActivos()).toBe(1);
    expect(contarAgrupadores()).toBe(2);
  });

  it('reuses the cliente on exact phone + fuzzy name (accents/typos ignored)', () => {
    const a = crear({ nombre: 'José García', telefono: '600111222', direccion: 'Av. del Sol 5' });
    cambiarEstado(a.id, 'pendiente_presupuesto');
    // No accent, slight typo, same phone → same person.
    const b = crear({ nombre: 'Jose Garcia', telefono: '600111222', direccion: 'Av. del Sol 5' });
    cambiarEstado(b.id, 'pendiente_presupuesto');

    expect(contarClientesActivos()).toBe(1);
  });

  it('reuses the agrupador when the address only differs by a fuzzy variation', () => {
    const a = crear({ nombre: 'Marta Ruiz', telefono: '611000000', direccion: 'Concepción Arenal 136 entl 4' });
    const segA = cambiarEstado(a.id, 'pendiente_presupuesto');
    const clienteId = (db().prepare('SELECT cliente_id FROM agrupadores a JOIN trabajos t ON t.agrupador_id = a.id WHERE t.id = ?').get(segA.trabajo_id) as { cliente_id: string }).cliente_id;

    const b = crear({ nombre: 'Marta Ruiz', telefono: '611000000', direccion: 'Concepcion Arenal 136 entl 4 A' });
    cambiarEstado(b.id, 'pendiente_presupuesto');

    expect(contarClientesActivos()).toBe(1);
    expect(contarAgrupadores(clienteId)).toBe(1);
  });

  it('creates a NEW cliente when the phone differs (does not fuse different people)', () => {
    const a = crear({ nombre: 'Juan Pérez', telefono: '600000001', direccion: 'Calle A 1' });
    cambiarEstado(a.id, 'pendiente_presupuesto');
    const b = crear({ nombre: 'Juan Pérez', telefono: '600000002', direccion: 'Calle B 2' });
    cambiarEstado(b.id, 'pendiente_presupuesto');

    expect(contarClientesActivos()).toBe(2);
  });
});

describe('cancellation rules', () => {
  it('allows cancelling from a cancelable state and wipes the auto-created obra', () => {
    const seg = crear({ nombre: 'Lola', telefono: '622000000', direccion: 'Calle Z 9' });
    const conObra = cambiarEstado(seg.id, 'pendiente_presupuesto');
    expect(conObra.trabajo_id).not.toBeNull();

    const cancelado = cambiarEstado(seg.id, 'cancelado');

    expect(cancelado.estado).toBe('cancelado');
    expect(cancelado.trabajo_id).toBeNull();
    // El cliente queda desactivado (borrado lógico) al no tener agrupadores activos.
    expect(contarClientesActivos()).toBe(0);
  });

  it('rejects cancelling once the obra is en_curso', () => {
    const seg = crear({ nombre: 'Pedro', telefono: '633000000', direccion: 'Calle Y 8' });
    cambiarEstado(seg.id, 'en_curso');

    expect(() => cambiarEstado(seg.id, 'cancelado')).toThrowError(/no se puede cancelar/i);
  });
});

describe('entregada PDF guard', () => {
  it('rejects entregada when there is no closed factura with a PDF', () => {
    const seg = crear({ nombre: 'Sara', telefono: '644000000', direccion: 'Calle X 7' });
    cambiarEstado(seg.id, 'en_curso'); // creates trabajo

    expect(() => cambiarEstado(seg.id, 'entregada')).toThrowError(/factura/i);
  });
});

describe('forward-only document → seguimiento sync', () => {
  it('advances on a closed factura but never goes backward on an older presupuesto', () => {
    const seg = crear({ nombre: 'Toni', telefono: '655000000', direccion: 'Calle W 6' });
    const enCurso = cambiarEstado(seg.id, 'en_curso');
    const trabajoId = enCurso.trabajo_id!;

    // Factura cerrada → seguimiento avanza a pendiente_facturar.
    syncSeguimientoDesdeDocumento(trabajoId, 'factura', 'cerrada');
    expect(obtener(seg.id)!.estado).toBe('pendiente_facturar');

    // Reenviar un presupuesto antiguo (enviado, rank menor) NO retrocede.
    syncSeguimientoDesdeDocumento(trabajoId, 'presupuesto', 'enviado');
    expect(obtener(seg.id)!.estado).toBe('pendiente_facturar');
  });

  it('ignores document syncs on terminal seguimiento states', () => {
    const seg = crear({ nombre: 'Eva', telefono: '666000000', direccion: 'Calle V 5' });
    const enCurso = cambiarEstado(seg.id, 'en_curso');
    const trabajoId = enCurso.trabajo_id!;
    // Forzar completado directamente.
    db().prepare("UPDATE seguimiento SET estado = 'completado' WHERE id = ?").run(seg.id);

    syncSeguimientoDesdeDocumento(trabajoId, 'presupuesto', 'enviado');
    expect(obtener(seg.id)!.estado).toBe('completado');
  });
});
