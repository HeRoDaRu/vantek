/**
 * ──────────────────────────────────────────────────────────────────────────────
 * config.store.ts — Zustand store for business profile + app configuration
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Loads and exposes the business profile (terminology + active modules) and
 *   the app configuration (company, documents, email, system). Provides the
 *   t() translator that maps generic entity keys to profile-specific labels.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · zustand (create) → store factory
 *   Used by:
 *     · Sidebar / pages → labels via t('entidades.…') and module flags
 *     · ConfigPage → reads/edits appConfig
 *     · DocumentoEditor, dashboard, etc. → IVA, margin and module gating
 *
 * STATE & ACTIONS
 *   · state: profile (ProfileConfig|null), appConfig (AppConfig|null), loaded, error
 *   · load() → GET /api/config/profile + GET /api/config/app (parallel, native fetch)
 *   · t(key) → resolves a dot-path key against `profile`, falls back to the key
 *
 * INPUTS / OUTPUTS
 *   Input:  dot-path string keys for t()
 *   Output: profile/appConfig objects and resolved label strings
 *
 * NOTES
 *   · load() uses native fetch (not @utils/api) so it can run before the axios
 *     instance/interceptor matters; it never rejects (errors stored in `error`).
 *   · The PUT /api/config/app write lives in ConfigPage, not here.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { create } from 'zustand';

export interface ProfileConfig {
  perfil: string;
  entidades: {
    cliente: string; clientes: string;
    agrupador: string; agrupadores: string;
    trabajo: string; trabajos: string;
  };
  menu: Record<string, string>;
  documentos: Record<string, string>;
  modulos: { albaranes: boolean; seguimiento: boolean; matriculas: boolean };
  seguimiento: { tipo: string; label: string; estados?: string[] };
  footer: { factura: string; presupuesto: string };
}

export interface AppConfig {
  puerto?: number;
  empresa: {
    nombre: string;
    cif: string;
    direccion: string;
    telefono: string;
    email: string;
    logo: string;
    mano_obra_precio_hora: number;
    mano_obra_unidad: string;
  };
  documentos: {
    iva_porcentaje: number;
    margen_defecto: number;
    max_versiones: number;
    numeracion_factura: {
      contador: number;
      anio: number;
      reinicio_pendiente: boolean;
    };
    footer_factura: string;
    footer_presupuesto: string;
    template_html?: string;
    template_path?: string;
  };
  conceptos_defecto: Array<{
    id: string;
    label: string;
    precio_hora: number;
    unidad: string;
  }>;
  sistema: {
    email_errores: string;
    actualizacion: {
      hora_inicio: string;
      hora_fin: string;
      inactividad_minutos: number;
    };
  };
  email: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
    };
    auth: {
      user: string;
      pass: string;
    };
  };
}

interface ConfigStore {
  profile: ProfileConfig | null;
  appConfig: AppConfig | null;
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  t: (key: string) => string;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  profile: null,
  appConfig: null,
  loaded: false,
  error: null,

  load: async () => {
    try {
      const [profileRes, appRes] = await Promise.all([
        fetch('/api/config/profile').then(r => r.json()),
        fetch('/api/config/app').then(r => r.json()),
      ]);
      set({ profile: profileRes, appConfig: appRes, loaded: true, error: null });
    } catch (e: any) {
      set({ error: e.message, loaded: true });
    }
  },

  t: (key: string): string => {
    const { profile } = get();
    if (!profile) return key;
    const parts = key.split('.');
    let val: unknown = profile;
    for (const p of parts) {
      if (val && typeof val === 'object') val = (val as Record<string, unknown>)[p];
      else return key;
    }
    return typeof val === 'string' ? val : key;
  },
}));