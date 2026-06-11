import { create } from 'zustand';
import api from '@utils/api';

export type EstadoSeguimiento =
  | 'nuevo'
  | 'contactado'
  | 'visita_agendada'
  | 'pendiente_presupuesto'
  | 'a_la_espera'
  | 'en_curso'
  | 'pendiente_facturar'
  | 'entregada'
  | 'pagada'
  | 'cancelado';

export interface Seguimiento {
  id: string;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  dni_cif: string | null;
  peticion: string | null;
  estado: EstadoSeguimiento;
  trabajo_id: string | null;
  fecha_visita: string | null;
  notas: string | null;
  // Taller
  matricula: string | null;
  marca_modelo: string | null;
  fecha_entrada: string | null;
  fecha_salida_estimada: string | null;
  descripcion_problema: string | null;
  firma_entrada: string | null;
  firma_salida: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  // JOINs
  trabajo_nombre?: string;
  agrupador_label?: string;
  cliente_nombre?: string;
}

export interface CrearSeguimientoDto {
  nombre: string;
  telefono?: string;
  direccion?: string;
  dni_cif?: string;
  peticion?: string;
  notas?: string;
  // Taller
  matricula?: string;
  marca_modelo?: string;
  fecha_entrada?: string;
  fecha_salida_estimada?: string;
  descripcion_problema?: string;
}

interface SeguimientoStore {
  lista: Seguimiento[];
  actual: Seguimiento | null;
  cargando: boolean;
  error: string | null;
  filtroEstado: EstadoSeguimiento | '';

  cargarLista: (estado?: EstadoSeguimiento | '') => Promise<void>;
  cargarSeguimiento: (id: string) => Promise<void>;
  crear: (dto: CrearSeguimientoDto) => Promise<Seguimiento>;
  actualizar: (id: string, dto: Partial<CrearSeguimientoDto> & { fecha_visita?: string; firma_entrada?: string; firma_salida?: string }) => Promise<void>;
  cambiarEstado: (id: string, estado: EstadoSeguimiento) => Promise<{ ok: boolean; error?: string; trabajo_id?: string }>;
  eliminar: (id: string) => Promise<void>;
  setFiltroEstado: (estado: EstadoSeguimiento | '') => void;
  limpiarActual: () => void;
}

export const useSeguimientoStore = create<SeguimientoStore>((set) => ({
  lista: [],
  actual: null,
  cargando: false,
  error: null,
  filtroEstado: '',

  setFiltroEstado: (estado) => set({ filtroEstado: estado }),
  limpiarActual: () => set({ actual: null }),

  cargarLista: async (estado) => {
    set({ cargando: true, error: null });
    try {
      const params = estado ? `?estado=${estado}` : '';
      const { data } = await api.get<Seguimiento[]>(`/seguimiento${params}`);
      set({ lista: data, cargando: false });
    } catch (e: any) {
      set({ error: e.message ?? 'Error cargando seguimiento', cargando: false });
    }
  },

  cargarSeguimiento: async (id) => {
    set({ cargando: true, error: null });
    try {
      const { data } = await api.get<Seguimiento>(`/seguimiento/${id}`);
      set({ actual: data, cargando: false });
    } catch (e: any) {
      set({ error: e.message ?? 'Error cargando seguimiento', cargando: false });
    }
  },

  crear: async (dto) => {
    const { data } = await api.post<Seguimiento>('/seguimiento', dto);
    set(s => ({ lista: [data, ...s.lista] }));
    return data;
  },

  actualizar: async (id, dto) => {
    const { data } = await api.put<Seguimiento>(`/seguimiento/${id}`, dto);
    set(s => ({
      lista: s.lista.map(x => x.id === id ? data : x),
      actual: s.actual?.id === id ? data : s.actual,
    }));
  },

  cambiarEstado: async (id, estado) => {
    try {
      const { data } = await api.post<Seguimiento & { trabajo_id?: string }>(`/seguimiento/${id}/estado`, { estado });
      set(s => ({
        lista: s.lista.map(x => x.id === id ? data : x),
        actual: s.actual?.id === id ? data : s.actual,
      }));
      return { ok: true, trabajo_id: data.trabajo_id ?? undefined };
    } catch (e: any) {
      const msg = e.response?.data?.error ?? e.message ?? 'Error cambiando estado';
      return { ok: false, error: msg };
    }
  },

  eliminar: async (id) => {
    await api.delete(`/seguimiento/${id}`);
    set(s => ({
      lista: s.lista.filter(x => x.id !== id),
      actual: s.actual?.id === id ? null : s.actual,
    }));
  },
}));