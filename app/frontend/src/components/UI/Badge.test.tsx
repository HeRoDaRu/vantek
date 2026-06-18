/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Badge.test.tsx — Status pill label/class mapping
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from './Badge';

describe('Badge', () => {
  it('maps a known estado to its Spanish label and CSS class', () => {
    const { container } = render(<Badge estado="pendiente_pago" />);
    expect(screen.getByText('Pendiente pago')).toBeInTheDocument();
    expect(container.querySelector('.badge-pendiente_pago')).not.toBeNull();
  });

  it('renders all 11 seguimiento states (incl. completado/cancelado)', () => {
    const estados = [
      ['nuevo', 'Nuevo'], ['contactado', 'Contactado'], ['visita_agendada', 'Visita agendada'],
      ['pendiente_presupuesto', 'Pendiente presupuesto'], ['a_la_espera', 'A la espera'],
      ['en_curso', 'En curso'], ['pendiente_facturar', 'Pendiente facturar'],
      ['entregada', 'Entregada'], ['pagada', 'Pagada'],
      ['completado', 'Completado'], ['cancelado', 'Cancelado'],
    ] as const;
    for (const [estado, label] of estados) {
      const { unmount } = render(<Badge estado={estado} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it('uses the label override when provided', () => {
    render(<Badge estado="nuevo" label="Personalizado" />);
    expect(screen.getByText('Personalizado')).toBeInTheDocument();
  });

  it('falls back to the raw key for an unknown estado', () => {
    render(<Badge estado="zzz_desconocido" />);
    expect(screen.getByText('zzz_desconocido')).toBeInTheDocument();
  });
});
