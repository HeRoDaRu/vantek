/**
 * ──────────────────────────────────────────────────────────────────────────────
 * toast.store.test.ts — Toast queue, dismissal & auto-expiry
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore, notificarError } from './toast.store';

beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.setState({ toasts: [] });
});
afterEach(() => vi.useRealTimers());

describe('toast.store', () => {
  it('mostrar() pushes a toast with the given type', () => {
    useToastStore.getState().mostrar('Hola', 'info');
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].mensaje).toBe('Hola');
    expect(toasts[0].tipo).toBe('info');
  });

  it('defaults the type to error', () => {
    useToastStore.getState().mostrar('Fallo');
    expect(useToastStore.getState().toasts[0].tipo).toBe('error');
  });

  it('auto-dismisses after 6s', () => {
    useToastStore.getState().mostrar('Temporal');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(6000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('descartar() removes a toast by id', () => {
    useToastStore.getState().mostrar('A');
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().descartar(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('notificarError() shows an error toast from outside React', () => {
    notificarError('Boom');
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].tipo).toBe('error');
    expect(toasts[0].mensaje).toBe('Boom');
  });
});
