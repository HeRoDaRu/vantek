/**
 * ──────────────────────────────────────────────────────────────────────────────
 * config.store.test.ts — Profile translator t() resolution
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useConfigStore } from './config.store';

const profile = {
  perfil: 'reformas',
  entidades: {
    cliente: 'Cliente', clientes: 'Clientes',
    agrupador: 'Dirección', agrupadores: 'Direcciones',
    trabajo: 'Obra', trabajos: 'Obras',
  },
  menu: { dashboard: 'Dashboard' },
  documentos: { factura: 'Factura' },
  modulos: { albaranes: true, seguimiento: true, matriculas: false },
  seguimiento: { tipo: 'reformas', label: 'Seguimiento' },
  footer: { factura: '', presupuesto: '' },
};

beforeEach(() => {
  useConfigStore.setState({ profile: null, appConfig: null, loaded: false, error: null });
});

describe('t() translator', () => {
  it('returns the key itself when no profile is loaded', () => {
    expect(useConfigStore.getState().t('entidades.cliente')).toBe('entidades.cliente');
  });

  it('resolves a dotted profile key to its label', () => {
    useConfigStore.setState({ profile });
    expect(useConfigStore.getState().t('entidades.agrupador')).toBe('Dirección');
    expect(useConfigStore.getState().t('seguimiento.label')).toBe('Seguimiento');
  });

  it('falls back to the key for an unknown path', () => {
    useConfigStore.setState({ profile });
    expect(useConfigStore.getState().t('entidades.noexiste')).toBe('entidades.noexiste');
  });
});
