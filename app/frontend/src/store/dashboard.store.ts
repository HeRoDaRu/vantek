/**
 * ──────────────────────────────────────────────────────────────────────────────
 * dashboard.store.ts — Zustand store for the dashboard (pendientes + economy)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Loads the dashboard payload: the «pendientes de acción» list (including
 *   factura_sin_cobrar) and the economic summary (cobrado real vs proyección)
 *   grouped by mes / trimestre / año. Keeps the current grouping in state.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · zustand (create) → store factory
 *     · @utils/api → axios instance (baseURL '/api')
 *   Used by:
 *     · DashboardPage → renders pendientes, KPIs and the chart
 *
 * STATE & ACTIONS
 *   · state: data (DashboardData|null), cargando, error, agrupacion
 *   · cargar(agrupacion?) → GET /dashboard?agrupacion=mes|trimestre|anio
 *   · setAgrupacion(a) → updates grouping then re-cargar()
 *
 * INPUTS / OUTPUTS
 *   Input:  agrupacion ('mes' | 'trimestre' | 'anio')
 *   Output: DashboardData (pendientes[], resumen, grafico_tipo)
 *
 * NOTES
 *   · factura_sin_cobrar pendientes carry the highest visual priority in the UI.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { create } from 'zustand';
import api from '@utils/api';

export type AgrupacionDashboard = 'mes' | 'trimestre' | 'anio';

export interface PendienteAccion {
  tipo: 'presupuesto_sin_convertir' | 'presupuesto_antiguo' | 'factura_sin_entregar' | 'factura_sin_cobrar';
  id: string;
  numero?: string;
  cliente: string;
  agrupador: string;
  importe: number;
  fecha: string;
  dias_espera?: number;
}

export interface PuntoGrafico {
  periodo: string;
  label: string;
  pagado: number;
  proyeccion: number;
}

export interface ResumenEconomico {
  agrupacion: AgrupacionDashboard;
  total_pagado: number;
  total_proyeccion: number;
  puntos: PuntoGrafico[];
}

export interface DashboardData {
  pendientes: PendienteAccion[];
  resumen: ResumenEconomico;
  grafico_tipo: string;
}

interface DashboardStore {
  data: DashboardData | null;
  cargando: boolean;
  error: string | null;
  agrupacion: AgrupacionDashboard;
  cargar: (agrupacion?: AgrupacionDashboard) => Promise<void>;
  setAgrupacion: (a: AgrupacionDashboard) => void;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  data: null,
  cargando: false,
  error: null,
  agrupacion: 'mes',

  setAgrupacion: (agrupacion) => {
    set({ agrupacion });
    get().cargar(agrupacion);
  },

  cargar: async (agrupacion) => {
    const ag = agrupacion ?? get().agrupacion;
    set({ cargando: true, error: null });
    try {
      const { data } = await api.get<DashboardData>(`/dashboard?agrupacion=${ag}`);
      set({ data, cargando: false, agrupacion: ag });
    } catch (e: any) {
      set({ error: e.message ?? 'Error cargando dashboard', cargando: false });
    }
  },
}));