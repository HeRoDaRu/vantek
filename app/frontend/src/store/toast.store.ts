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
