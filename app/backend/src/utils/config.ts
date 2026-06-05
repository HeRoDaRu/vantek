import fs from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(__dirname, '..', '..', 'config');
const PROFILE_PATH = path.join(CONFIG_DIR, 'profile.config.json');
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
    };
    footer_factura: string;
    footer_presupuesto: string;
    template_html?: string;
    template_path?: string;
  };
  dashboard: {
    grafico_tipo: string;
    dias_presupuesto_antiguo: number;
    dias_factura_sin_cobrar: number;
  };
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
      from: string;
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

export function reloadProfileConfig(): void {
  profileCache = null;
}

// ─── Migrate de configuración ─────────────────────────────────────────────────
// Compara el template con el config real y añade las claves que falten.
// Nunca sobreescribe valores existentes. Se ejecuta en cada arranque.

function mergeDeep(template: any, actual: any): { resultado: any; cambios: number } {
  let cambios = 0;
  const resultado = { ...actual };

  for (const key of Object.keys(template)) {
    if (!(key in resultado)) {
      // Clave nueva en el template que no existe en el config real
      resultado[key] = template[key];
      cambios++;
    } else if (
      typeof template[key] === 'object' &&
      template[key] !== null &&
      !Array.isArray(template[key]) &&
      typeof resultado[key] === 'object' &&
      resultado[key] !== null
    ) {
      // Ambos son objetos — recursión
      const sub = mergeDeep(template[key], resultado[key]);
      resultado[key] = sub.resultado;
      cambios += sub.cambios;
    }
    // Si el tipo difiere o es un valor primitivo existente, no tocamos nada
  }

  return { resultado, cambios };
}

export function migrateConfig(): void {
  const templatePath = path.join(CONFIG_DIR, 'app.config.template.json');

  if (!fs.existsSync(templatePath) || !fs.existsSync(APP_PATH)) {
    // Sin template o sin config real no hay nada que migrar
    return;
  }

  try {
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
    const actual   = JSON.parse(fs.readFileSync(APP_PATH, 'utf-8'));

    const { resultado, cambios } = mergeDeep(template, actual);

    if (cambios > 0) {
      fs.writeFileSync(APP_PATH, JSON.stringify(resultado, null, 2), 'utf-8');
      appCache = null; // invalidar caché
      console.log(`[Config] Migrate: ${cambios} clave(s) nueva(s) añadida(s) al app.config.json`);
    }
  } catch (err) {
    console.error('[Config] Error en migrate de configuración:', err);
    // No lanzamos — un fallo en migrate no debe impedir arrancar el servidor
  }
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

