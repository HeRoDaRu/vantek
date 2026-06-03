import fs from 'fs';
import path from 'path';

const CONFIG_DIR = path.resolve(process.cwd(), '../../config');
const PROFILE_PATH = path.join(CONFIG_DIR, 'default.config.json');
const APP_PATH = path.join(CONFIG_DIR, 'app.config.json');

export interface ProfileConfig {
  perfil: string;
  version: string;
  entidades: {
    cliente: string;
    clientes: string;
    agrupador: string;
    agrupadores: string;
    trabajo: string;
    trabajos: string;
  };
  menu: Record<string, string>;
  documentos: Record<string, string>;
  modulos: {
    albaranes: boolean;
    seguimiento: boolean;
    matriculas: boolean;
  };
  seguimiento: {
    tipo: 'reformas' | 'taller';
    label: string;
  };
  footer: {
    factura: string;
    presupuesto: string;
  };
}

export interface AppConfig {
  empresa: {
    nombre: string;
    cif: string;
    direccion: string;
    telefono: string;
    email: string;
    logo: string;
  };
  documentos: {
    iva: number;
    margen_defecto: number;
    max_versiones: number;
    numeracion_factura: {
      contador: number;
      anno: number;
      reinicio_pendiente: boolean;
    };
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

let profileCache: ProfileConfig | null = null;
let appCache: AppConfig | null = null;

export function getProfileConfig(): ProfileConfig {
  if (!profileCache) {
    profileCache = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'));
  }
  return profileCache!;
}

export function getAppConfig(): AppConfig {
  if (!appCache) {
    appCache = JSON.parse(fs.readFileSync(APP_PATH, 'utf-8'));
  }
  return appCache!;
}

export function saveAppConfig(config: AppConfig): void {
  appCache = config;
  fs.writeFileSync(APP_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function reloadAppConfig(): void {
  appCache = null;
}

// Función de traducción — nunca texto literal en el código
export function t(key: string): string {
  const config = getProfileConfig();
  const parts = key.split('.');
  let val: unknown = config;
  for (const p of parts) {
    if (val && typeof val === 'object') {
      val = (val as Record<string, unknown>)[p];
    } else return key;
  }
  return typeof val === 'string' ? val : key;
}
