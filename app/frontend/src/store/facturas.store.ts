import { create } from 'zustand';
import api from '@utils/api';

export type EstadoFactura =
  | 'borrador' | 'cerrada' | 'entregada' | 'pendiente_pago' | 'pagada';

export interface LineaFactura {
  id: string;
  factura_id: string;
  descripcion: string;
  cantidad: number;
  unidad: string | null;
  precio_unitario: number;
  coste_unitario: number | null;
  margen_porcentaje: number | null;
  tipo: 'material' | 'manual' | 'concepto';
  es_libre: boolean;
  albaran_linea_id: string | null;
  orden: number;
}

export interface Factura {
  id: string;
  trabajo_id: string;
  trabajo_nombre: string;
  agrupador_id: string;
  agrupador_label: string;
  cliente_id: string;
  cliente_nombre: string;
  cliente_empresa: string | null;
  cliente_dni_cif: string | null;
  cliente_email: string | null;
  presupuesto_origen_id: string | null;
  numero: string | null;
  estado: EstadoFactura;
  fecha: string;
  fecha_cierre: string | null;
  notas: string | null;
  iva_porcentaje: number;
  lineas: LineaFactura[];
  versiones: { id: string; numero_version: number; pdf_path: string; created_at: string }[];
  totales: { subtotal: number; iva: number; iva_porcentaje: number; total: number };
  borrador_data: string | null;
  borrador_updated_at: string | null;
  updated_at: string;
}

export interface FacturaListItem {
  id: string;
  trabajo_id: string;
  trabajo_nombre: string;
  agrupador_id: string;
  agrupador_label: string;
  cliente_id: string;
  cliente_nombre: string;
  numero: string | null;
  estado: EstadoFactura;
  fecha: string;
  subtotal: number;
  total: number;
}

interface FacturasStore {
  lista: FacturaListItem[];
  actual: Factura | null;
  loading: boolean;
  error: string | null;

  cargarLista: (filtros?: { trabajo_id?: string; estado?: string; cliente_id?: string }) => Promise<void>;
  cargarFactura: (id: string) => Promise<void>;
  crearFactura: (data: { trabajo_id: string; fecha?: string; notas?: string; presupuesto_origen_id?: string }) => Promise<Factura>;
  guardarLineas: (id: string, lineas: Omit<LineaFactura, 'id' | 'factura_id' | 'orden'>[]) => Promise<void>;
  guardarBorrador: (id: string, data: unknown) => Promise<void>;
  cerrarFactura: (id: string) => Promise<{ ok: boolean; error?: string }>;
  cambiarEstado: (id: string, estado: EstadoFactura) => Promise<void>;
  generarPdf: (id: string) => Promise<{ pdf_path: string; version: number }>;
  enviar: (id: string, email_destino?: string) => Promise<void>;
  eliminar: (id: string) => Promise<void>;
  limpiarActual: () => void;
}

export const useFacturasStore = create<FacturasStore>((set) => ({
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
      const { data } = await api.get(`/facturas?${params}`);
      set({ lista: data });
    } catch {
      set({ error: 'Error al cargar facturas' });
    } finally {
      set({ loading: false });
    }
  },

  cargarFactura: async (id) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get(`/facturas/${id}`);
      set({ actual: data });
    } catch {
      set({ error: 'Error al cargar la factura' });
    } finally {
      set({ loading: false });
    }
  },

  crearFactura: async (data) => {
    const res = await api.post('/facturas', data);
    return res.data;
  },

  guardarLineas: async (id, lineas) => {
    const res = await api.put(`/facturas/${id}/lineas`, { lineas });
    set({ actual: res.data });
  },

  guardarBorrador: async (id, data) => {
    await api.post(`/facturas/${id}/borrador`, data);
  },

  cerrarFactura: async (id) => {
    try {
      const res = await api.post(`/facturas/${id}/cerrar`);
      set({ actual: res.data.factura });
      return { ok: true };
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Error al cerrar la factura';
      return { ok: false, error: msg };
    }
  },

  cambiarEstado: async (id, estado) => {
    const res = await api.post(`/facturas/${id}/estado`, { estado });
    set({ actual: res.data });
  },

  generarPdf: async (id) => {
    const res = await api.post(`/facturas/${id}/pdf`);
    return res.data;
  },

  enviar: async (id, email_destino) => {
    await api.post(`/facturas/${id}/enviar`, { email_destino });
  },

  eliminar: async (id) => {
    await api.delete(`/facturas/${id}`);
  },

  limpiarActual: () => set({ actual: null }),
}));