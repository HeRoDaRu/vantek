import { create } from 'zustand';
import api from '@utils/api';

export interface TrabajoBrief {
  id: string; nombre: string; estado: string; created_at: string;
}

export interface Agrupador {
  id: string; cliente_id: string; label: string; descripcion?: string;
  activo: boolean; created_at: string; updated_at: string;
  trabajos?: TrabajoBrief[];
}

export interface Cliente {
  id: string; nombre: string; empresa?: string; dni_cif?: string;
  telefono?: string; email?: string; notas?: string;
  activo: boolean; created_at: string; updated_at: string;
  agrupadores?: Agrupador[];
}

interface ClientesStore {
  clientes: Cliente[];
  selected: Cliente | null;
  loading: boolean;
  error: string | null;
  fetchAll: (search?: string) => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  create: (data: Partial<Cliente>) => Promise<Cliente>;
  update: (id: string, data: Partial<Cliente>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  createAgrupador: (clienteId: string, data: { label: string; descripcion?: string }) => Promise<Agrupador>;
  updateAgrupador: (clienteId: string, agrupadorId: string, data: { label?: string; descripcion?: string }) => Promise<void>;
  removeAgrupador: (clienteId: string, agrupadorId: string) => Promise<void>;
  createTrabajo: (clienteId: string, agrupadorId: string, data: { nombre: string; descripcion?: string; margen_porcentaje?: number }) => Promise<TrabajoBrief>;
}

export const useClientesStore = create<ClientesStore>((set) => ({
  clientes: [],
  selected: null,
  loading: false,
  error: null,

  fetchAll: async (search?) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/clientes', { params: search ? { search } : {} });
      set({ clientes: res.data.data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchById: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/clientes/${id}`);
      set({ selected: res.data.data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  create: async (data) => {
    const res = await api.post('/clientes', data);
    const nuevo = res.data.data;
    set(s => ({ clientes: [nuevo, ...s.clientes] }));
    return nuevo;
  },

  update: async (id, data) => {
    const res = await api.put(`/clientes/${id}`, data);
    set(s => ({
      clientes: s.clientes.map(c => c.id === id ? { ...c, ...res.data.data } : c),
      selected: s.selected?.id === id ? res.data.data : s.selected,
    }));
  },

  remove: async (id) => {
    await api.delete(`/clientes/${id}`);
    set(s => ({ clientes: s.clientes.filter(c => c.id !== id) }));
  },

  createAgrupador: async (clienteId, data) => {
    const res = await api.post(`/clientes/${clienteId}/agrupadores`, data);
    const nuevo = { ...res.data.data, trabajos: [] };
    set(s => ({
      selected: s.selected?.id === clienteId
        ? { ...s.selected, agrupadores: [nuevo, ...(s.selected.agrupadores || [])] }
        : s.selected
    }));
    return nuevo;
  },

  updateAgrupador: async (clienteId, agrupadorId, data) => {
    const res = await api.put(`/clientes/${clienteId}/agrupadores/${agrupadorId}`, data);
    set(s => ({
      selected: s.selected?.id === clienteId ? {
        ...s.selected,
        agrupadores: s.selected.agrupadores?.map(a => a.id === agrupadorId ? { ...a, ...res.data.data } : a)
      } : s.selected
    }));
  },

  removeAgrupador: async (clienteId, agrupadorId) => {
    await api.delete(`/clientes/${clienteId}/agrupadores/${agrupadorId}`);
    set(s => ({
      selected: s.selected?.id === clienteId ? {
        ...s.selected,
        agrupadores: s.selected.agrupadores?.filter(a => a.id !== agrupadorId)
      } : s.selected
    }));
  },

  createTrabajo: async (clienteId, agrupadorId, data) => {
    const res = await api.post(`/clientes/${clienteId}/agrupadores/${agrupadorId}/trabajos`, data);
    const nuevo = res.data.data;
    set(s => ({
      selected: s.selected?.id === clienteId ? {
        ...s.selected,
        agrupadores: s.selected.agrupadores?.map(a =>
          a.id === agrupadorId
            ? { ...a, trabajos: [nuevo, ...(a.trabajos || [])] }
            : a
        )
      } : s.selected
    }));
    return nuevo;
  },
}));