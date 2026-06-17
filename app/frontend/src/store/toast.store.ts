/**
 * ──────────────────────────────────────────────────────────────────────────────
 * toast.store.ts — Zustand store for transient toast notifications
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Holds a queue of toast notifications (error/success/info) and exposes
 *   actions to show and dismiss them. Each toast auto-dismisses after a fixed
 *   duration. Also exposes a non-React helper for code outside components.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · zustand (create) → store factory
 *   Used by:
 *     · Toaster (UI) → renders the active toasts
 *     · @utils/api interceptor → notificarError() on failed requests
 *
 * STATE & ACTIONS
 *   · state: toasts[] ({ id, tipo, mensaje })
 *   · mostrar(mensaje, tipo='error') → pushes a toast, auto-dismiss after 6s
 *   · descartar(id) → removes a toast by id
 *
 * EXPORTS
 *   · useToastStore → the Zustand hook
 *   · notificarError(mensaje) → imperative helper to show an error toast from
 *       non-React code (uses useToastStore.getState())
 *
 * INPUTS / OUTPUTS
 *   Input:  message strings and toast type
 *   Output: toast list rendered by the Toaster component
 *
 * NOTES
 *   · No backend calls — purely client-side UI state.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { create } from 'zustand';

export type ToastTipo = 'error' | 'success' | 'info';

export interface Toast {
  id: string;
  tipo: ToastTipo;
  mensaje: string;
}

interface ToastStore {
  toasts: Toast[];
  mostrar: (mensaje: string, tipo?: ToastTipo) => void;
  descartar: (id: string) => void;
}

const DURACION_MS = 6000;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  mostrar: (mensaje, tipo = 'error') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((s) => ({ toasts: [...s.toasts, { id, tipo, mensaje }] }));
    setTimeout(() => get().descartar(id), DURACION_MS);
  },

  descartar: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Acceso desde código fuera de React (p. ej. el interceptor de axios).
export function notificarError(mensaje: string) {
  useToastStore.getState().mostrar(mensaje, 'error');
}
