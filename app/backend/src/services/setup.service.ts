import fs from 'fs';
import path from 'path';
import { PerfilNegocio, SetupPayload, DefaultConfig } from '../types';
import { AppConfig, reloadAppConfig, reloadProfileConfig } from '@utils/config';
import { CONFIG_DIR } from '@utils/paths';

const APP_CONFIG_PATH = path.join(CONFIG_DIR, 'app.config.json');
const DEFAULT_CONFIG_PATH = path.join(CONFIG_DIR, 'profile.config.json');

// ─── Perfiles predefinidos ────────────────────────────────────────────────────

const PERFILES: Record<Exclude<PerfilNegocio, 'otro'>, DefaultConfig> = {
  reformas: {
    perfil: 'reformas',
    version: '1.0.0',
    entidades: {
      cliente: 'Cliente',
      clientes: 'Clientes',
      agrupador: 'Dirección',
      agrupadores: 'Direcciones',
      trabajo: 'Obra',
      trabajos: 'Obras',
    },
    menu: {
      dashboard: 'Dashboard',
      clientes: 'Clientes',
      facturas: 'Facturas',
      presupuestos: 'Presupuestos',
      albaranes: 'Albaranes',
      seguimiento: 'Seguimiento',
      configuracion: 'Configuración',
    },
    documentos: {
      albaran: 'Albarán',
      albaranes: 'Albaranes',
      presupuesto: 'Presupuesto',
      presupuestos: 'Presupuestos',
      factura: 'Factura',
      facturas: 'Facturas',
    },
    modulos: {
      albaranes: true,
      seguimiento: true,
      matriculas: false,
    },
    seguimiento: {
      tipo: 'reformas',
      label: 'Seguimiento',
    },
    footer: {
      factura: 'Garantía de 2 años en todos los trabajos realizados.',
      presupuesto: 'Precios sin IVA. Presupuesto válido por 30 días desde la fecha de emisión.',
    },
  },
  taller: {
    perfil: 'taller',
    version: '1.0.0',
    entidades: {
      cliente: 'Cliente',
      clientes: 'Clientes',
      agrupador: 'Matrícula',
      agrupadores: 'Matrículas',
      trabajo: 'Reparación',
      trabajos: 'Reparaciones',
    },
    menu: {
      dashboard: 'Dashboard',
      clientes: 'Clientes',
      facturas: 'Facturas',
      presupuestos: 'Presupuestos',
      albaranes: 'Albaranes',
      seguimiento: 'Órdenes de trabajo',
      configuracion: 'Configuración',
    },
    documentos: {
      albaran: 'Albarán',
      albaranes: 'Albaranes',
      presupuesto: 'Presupuesto',
      presupuestos: 'Presupuestos',
      factura: 'Factura',
      facturas: 'Facturas',
    },
    modulos: {
      albaranes: true,
      seguimiento: true,
      matriculas: true,
    },
    seguimiento: {
      tipo: 'orden_trabajo',
      label: 'Orden de trabajo',
    },
    footer: {
      factura: 'Gracias por confiar en nuestro taller.',
      presupuesto: 'Presupuesto válido por 15 días desde la fecha de emisión.',
    },
  },
};

// ─── Funciones públicas ───────────────────────────────────────────────────────

export function checkSetupRequired(): boolean {
  if (!fs.existsSync(APP_CONFIG_PATH) || !fs.existsSync(DEFAULT_CONFIG_PATH)) {
    return true;
  }

  const appConfig: AppConfig = JSON.parse(fs.readFileSync(APP_CONFIG_PATH, 'utf-8'));
  const defaultConfig: DefaultConfig = JSON.parse(fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf-8'));

  return !appConfig?.empresa?.nombre?.trim() || !defaultConfig?.perfil?.trim();
}

export function buildDefaultConfig(payload: SetupPayload): DefaultConfig {
  if (payload.perfil === 'otro') {
    const custom = payload.entidades_custom!;
    // Usamos reformas como base estructural y sobreescribimos entidades y seguimiento
    return {
      ...PERFILES['reformas'],
      perfil: 'personalizado',
      entidades: {
        cliente: custom.cliente,
        clientes: custom.clientes,
        agrupador: custom.agrupador,
        agrupadores: custom.agrupadores,
        trabajo: custom.trabajo,
        trabajos: custom.trabajos,
      },
      seguimiento: {
        tipo: 'personalizado',
        label: 'Seguimiento',
      },
      footer: {
        factura: '',
        presupuesto: '',
      },
    };
  }

  return { ...PERFILES[payload.perfil] };
}

export function buildAppConfig(payload: SetupPayload): AppConfig {
  // Leer config existente para no machacar contadores ni configuración previa
  let existing: AppConfig | null = null;
  if (fs.existsSync(APP_CONFIG_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(APP_CONFIG_PATH, 'utf-8'));
    } catch {
      // Si el fichero está corrupto lo recreamos desde cero
    }
  }

  const base: AppConfig = existing ?? {
    empresa: {
      nombre: '',
      cif: '',
      direccion: '',
      telefono: '',
      email: '',
      logo: '',
      mano_obra_precio_hora: 45,
      mano_obra_unidad: 'hora'
    },
    documentos: {
      iva_porcentaje: 21,
      margen_defecto: 20,
      max_versiones: 10,
      numeracion_facturas: {
        contador: 0,
        anio: new Date().getFullYear(),
      },
      footer_factura: '',
      footer_presupuesto: '',
      template_html: '',
      template_path: '',
    },
    dashboard: {
      grafico_tipo: 'barras_lineas',
      dias_presupuesto_antiguo: 30,
      dias_factura_sin_cobrar: 30,
    },
    email: {
      smtp: {
        host: '',
        port: 587,
        secure: false,
        from: ''
      },
      auth: {
        user: '',
        pass: '',
      }
    },
    sistema: {
      email_errores: '',
      actualizacion: {
        hora_inicio: '15:00',
        hora_fin: '16:00',
        inactividad_minutos: 15,
      }
    },
  };

  return {
    ...base,
    empresa: {
      nombre: payload.empresa.nombre.trim(),
      cif: payload.empresa.cif.trim(),
      direccion: payload.empresa.direccion?.trim() ?? '',
      telefono: payload.empresa.telefono?.trim() ?? '',
      email: payload.empresa.email?.trim() ?? '',
      logo: payload.empresa.logo?.trim() ?? '',
      mano_obra_precio_hora: base.empresa.mano_obra_precio_hora,
      mano_obra_unidad: base.empresa.mano_obra_unidad
    },
  };
}

export function saveSetup(payload: SetupPayload): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });

  const defaultConfig = buildDefaultConfig(payload);
  const appConfig = buildAppConfig(payload);

  fs.writeFileSync(DEFAULT_CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  fs.writeFileSync(APP_CONFIG_PATH, JSON.stringify(appConfig, null, 2), 'utf-8');

  reloadAppConfig();
  reloadProfileConfig();
}