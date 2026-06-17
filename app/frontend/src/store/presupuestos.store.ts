/**
 * ──────────────────────────────────────────────────────────────────────────────
 * presupuestos.store.ts — Zustand store for quotes (presupuestos)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Manages the quote list and the currently open quote with its lines,
 *   versions and totals. Covers create, edit header/lines, autosave drafts,
 *   change state, generate PDF, send by email and delete. Quotes have no IVA
 *   in the total and no albaranes (estimations only).
 *
 * RELATIONSHIPS
 *   Imports:
 *     · zustand (create) → store factory
 *     · @utils/api → axios instance (baseURL '/api')
 *   Used by:
 *     · PresupuestosListPage → list with filters
 *     · PresupuestoPage / DocumentoEditor / BarraAcciones → edit & actions
 *
 * STATE & ACTIONS
 *   · state: lista[], actual (Presupuesto|null), loading, error
 *   · cargarLista(filtros?) → GET /presupuestos?<query>
 *   · cargarPresupuesto(id) → GET /presupuestos/:id
 *   · crearPresupuesto(data) → POST /presupuestos
 *   · actualizarCabecera(id, data) → PUT /presupuestos/:id
 *   · guardarLineas(id, lineas) → PUT /presupuestos/:id/lineas
 *   · guardarBorrador(id, data) → POST /presupuestos/:id/borrador (autosave)
 *   · cambiarEstado(id, estado) → POST /presupuestos/:id/estado
 *   · generarPdf(id) → POST /presupuestos/:id/pdf
 *   · enviar(id, email_destino?) → POST /presupuestos/:id/enviar
 *   · eliminar(id) → DELETE /presupuestos/:id
 *   · limpiarActual() → clears `actual` (local only)
 *
 * INPUTS / OUTPUTS
 *   Input:  filter objects, line DTOs (without id/presupuesto_id/orden), ids
 *   Output: typed Presupuesto / PresupuestoListItem
 *
 * NOTES
 *   · Accepting a quote (estado='aceptado') triggers backend sync that creates
 *     the linked trabajo and moves the seguimiento to en_curso.
 *   · Shares the DocumentoEditor component with facturas.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { create } from 'zustand';
import api from '@utils/api';

export type EstadoPresupuesto =
  | 'borrador' | 'enviado' | 'aceptado' | 'rechazado' | 'caducado';

export interface LineaPresupuesto {
  id: string;
  presupuesto_id: string;
  descripcion: string;
  cantidad: number;
  unidad: string | null;
  precio_unitario: number;
  coste_unitario: number | null;
  margen_porcentaje: number | null;
  tipo: 'material' | 'manual' | 'concepto';
  orden: number;
}

export interface Presupuesto {
  id: string;
  trabajo_id: string;
  trabajo_nombre: string;
  agrupador_id: string;
  agrupador_label: string;
  cliente_id: string;
  cliente_nombre: string;
  cliente_email: string | null;
  numero: string | null;
  estado: EstadoPresupuesto;
  fecha: string;
  notas: string | null;
  iva_porcentaje: number;
  lineas: LineaPresupuesto[];
  versiones: { id: string; numero_version: number; pdf_path: string; created_at: string }[];
  totales: { subtotal: number; total: number };
  borrador_data: string | null;
  borrador_updated_at: string | null;
  updated_at: string;
}

export interface PresupuestoListItem {
  id: string;
  trabajo_id: string;
  trabajo_nombre: string;
  agrupador_id: string;
  agrupador_label: string;
  cliente_id: string;
  cliente_nombre: string;
  numero: string | null;
  estado: EstadoPresupuesto;
  fecha: string;
  importe: number;
}

interface PresupuestosStore {
  lista: PresupuestoListItem[];
  actual: Presupuesto | null;
  loading: boolean;
  error: string | null;

  cargarLista: (filtros?: { trabajo_id?: string; estado?: string; cliente_id?: string }) => Promise<void>;
  cargarPresupuesto: (id: string) => Promise<void>;
  crearPresupuesto: (data: { trabajo_id: string; fecha?: string; notas?: string }) => Promise<Presupuesto>;
  actualizarCabecera: (id: string, data: { notas?: string; fecha?: string }) => Promise<void>;
  guardarLineas: (id: string, lineas: Omit<LineaPresupuesto, 'id' | 'presupuesto_id' | 'orden'>[]) => Promise<void>;
  guardarBorrador: (id: string, data: unknown) => Promise<void>;
  cambiarEstado: (id: string, estado: EstadoPresupuesto) => Promise<void>;
  generarPdf: (id: string) => Promise<{ pdf_path: string; version: number }>;
  enviar: (id: string, email_destino?: string) => Promise<void>;
  eliminar: (id: string) => Promise<void>;
  limpiarActual: () => void;
}

export const usePresupuestosStore = create<PresupuestosStore>((set) => ({
  lista: [],
  actual: null,
  loading: false,
  error: null,

  cargarLista: async (filtros = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(
        Object.entries(filtros).filter(([, v]) => v) as [string, string][]
      );
      const { data } = await api.get(`/presupuestos?${params}`);
      set({ lista: data });
    } catch {
      set({ error: 'Error al cargar presupuestos' });
    } finally {
      set({ loading: false });
    }
  },

  cargarPresupuesto: async (id) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get(`/presupuestos/${id}`);
      set({ actual: data });
    } catch {
      set({ error: 'Error al cargar el presupuesto' });
    } finally {
      set({ loading: false });
    }
  },

  crearPresupuesto: async (data) => {
    const res = await api.post('/presupuestos', data);
    return res.data;
  },

  actualizarCabecera: async (id, data) => {
    const res = await api.put(`/presupuestos/${id}`, data);
    set({ actual: res.data });
  },

  guardarLineas: async (id, lineas) => {
    const res = await api.put(`/presupuestos/${id}/lineas`, { lineas });
    set({ actual: res.data });
  },

  guardarBorrador: async (id, data) => {
    await api.post(`/presupuestos/${id}/borrador`, data);
  },

  cambiarEstado: async (id, estado) => {
    const res = await api.post(`/presupuestos/${id}/estado`, { estado });
    set({ actual: res.data });
  },

  generarPdf: async (id) => {
    const res = await api.post(`/presupuestos/${id}/pdf`);
    return res.data;
  },

  enviar: async (id, email_destino) => {
    await api.post(`/presupuestos/${id}/enviar`, { email_destino });
  },

  eliminar: async (id) => {
    await api.delete(`/presupuestos/${id}`);
  },

  limpiarActual: () => set({ actual: null }),
}));