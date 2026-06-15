import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { getAppConfig, getProfileConfig, AppConfig } from '@utils/config';
import { APP_ROOT, PDFS_DIR } from '@utils/paths';

// ─── Tipos mínimos que necesita el template ───────────────────────────────────

interface DocumentoParaPdf {
  id: string;
  numero?: string | null;
  fecha: string;
  estado: string;
  notas?: string | null;
  iva_porcentaje: number;
  cliente_nombre?: string;
  cliente_empresa?: string;
  cliente_dni_cif?: string;
  cliente_direccion?: string;
  agrupador_label?: string;
  lineas: {
    descripcion: string;
    cantidad: number;
    unidad?: string | null;
    precio_unitario: number;
  }[];
  totales: {
    subtotal: number;
    iva?: number;
    iva_porcentaje?: number;
    total: number;
  };
}

type TipoDocumento = 'factura' | 'presupuesto';

// ─── Directorio de salida ─────────────────────────────────────────────────────

function dirPdfs(): string {
  const dir = PDFS_DIR;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── Formateo ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Formatea una fecha tipo "2025-01-22" como "22 de Enero 2025".
function fmtFecha(fecha?: string | null): string {
  if (!fecha) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (!m) return fecha;
  const dia = parseInt(m[3], 10);
  const mes = MESES_ES[parseInt(m[2], 10) - 1] ?? '';
  return `${dia} de ${mes} ${m[1]}`;
}

// Escapa texto para insertarlo de forma segura en el HTML del template.
function esc(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

// Devuelve un src usable en <img> para el logo de la empresa. Acepta un data URI
// (lo más habitual, subido desde Configuración) o una ruta de fichero en disco,
// que se lee y se convierte a data URI. Devuelve cadena vacía si no hay logo.
function logoSrc(valor?: string | null): string {
  if (!valor) return '';
  const v = valor.trim();
  if (!v) return '';
  if (v.startsWith('data:')) return v;
  try {
    if (!fs.existsSync(v)) return '';
    const buf = fs.readFileSync(v);
    const ext = path.extname(v).toLowerCase();
    const mime =
      ext === '.png' ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : ext === '.gif' ? 'image/gif'
      : ext === '.svg' ? 'image/svg+xml'
      : ext === '.webp' ? 'image/webp'
      : 'application/octet-stream';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return '';
  }
}

// ─── Carga de plantillas ──────────────────────────────────────────────────────

// Las plantillas (.html/.css) viven en src/templates y se copian a dist/templates
// en el build (scripts/copy-templates.mjs). Se resuelven relativas al fichero
// compilado, de modo que funciona igual en dev (tsx → src/templates) y en
// producción (dist/templates), en Windows portable y en Docker.
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

function leerCss(): string {
  try {
    return fs.readFileSync(path.join(TEMPLATES_DIR, 'documento.css'), 'utf-8');
  } catch {
    return '';
  }
}

// Devuelve el HTML de la plantilla a usar. Precedencia:
//   1. documentos.template_html  — plantilla en línea editada desde Configuración
//   2. documentos.template_path  — fichero HTML externo apuntado por el usuario
//   3. plantilla incluida (dist/templates/documento.html)
function cargarPlantilla(): string {
  const docs = getAppConfig().documentos ?? {};

  if (docs.template_html && docs.template_html.trim()) {
    return docs.template_html;
  }

  if (docs.template_path && docs.template_path.trim()) {
    const ruta = path.isAbsolute(docs.template_path)
      ? docs.template_path
      : path.join(APP_ROOT, docs.template_path);
    try {
      if (fs.existsSync(ruta)) return fs.readFileSync(ruta, 'utf-8');
    } catch {
      /* cae a la plantilla incluida */
    }
  }

  return fs.readFileSync(path.join(TEMPLATES_DIR, 'documento.html'), 'utf-8');
}

// ─── Motor de plantillas ──────────────────────────────────────────────────────
// Mini-motor sin dependencias. Soporta:
//   {{clave}}        valor escapado
//   {{{clave}}}      valor sin escapar (logo, CSS…)
//   {{#if clave}}…{{else}}…{{/if}}
//   {{#each lista}}…{{/each}}   (las claves del elemento quedan accesibles dentro)
// Los bloques pueden anidarse.

type Contexto = Record<string, unknown>;

function lookup(ctx: Contexto, clave: string): unknown {
  return clave
    .split('.')
    .reduce<unknown>((o, k) => (o == null ? undefined : (o as Contexto)[k]), ctx);
}

function esTruthy(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0;
  return Boolean(v);
}

// Sustituye las interpolaciones de un fragmento que ya no contiene bloques.
function interpolar(tpl: string, ctx: Contexto): string {
  return tpl
    .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_m, k: string) => {
      const v = lookup(ctx, k);
      return v == null ? '' : String(v);
    })
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k: string) => esc(lookup(ctx, k)));
}

// Localiza el cierre del bloque abierto en `desde`, respetando anidamiento.
function finBloque(s: string, desde: number): { inner: string; fin: number } {
  const re = /\{\{#(?:if|each)\s+[\w.]+\s*\}\}|\{\{\/(?:if|each)\}\}/g;
  re.lastIndex = desde;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m[0].startsWith('{{#')) depth++;
    else depth--;
    if (depth === 0) return { inner: s.slice(desde, m.index), fin: re.lastIndex };
  }
  return { inner: s.slice(desde), fin: s.length };
}

// Separa el cuerpo de un {{#if}} en sus ramas por el {{else}} de nivel superior.
function partirElse(inner: string): [string, string] {
  const re = /\{\{#(?:if|each)\s+[\w.]+\s*\}\}|\{\{\/(?:if|each)\}\}|\{\{else\}\}/g;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    if (m[0] === '{{else}}') {
      if (depth === 0) return [inner.slice(0, m.index), inner.slice(re.lastIndex)];
    } else if (m[0].startsWith('{{#')) {
      depth++;
    } else {
      depth--;
    }
  }
  return [inner, ''];
}

function renderTemplate(tpl: string, ctx: Contexto): string {
  const apertura = /\{\{#(if|each)\s+([\w.]+)\s*\}\}/;
  let salida = '';
  let resto = tpl;
  let m: RegExpExecArray | null;

  while ((m = apertura.exec(resto)) !== null) {
    salida += interpolar(resto.slice(0, m.index), ctx);

    const tipo = m[1];
    const clave = m[2];
    const inicio = m.index + m[0].length;
    const { inner, fin } = finBloque(resto, inicio);
    const valor = lookup(ctx, clave);

    if (tipo === 'if') {
      const [siRama, noRama] = partirElse(inner);
      salida += esTruthy(valor) ? renderTemplate(siRama, ctx) : renderTemplate(noRama, ctx);
    } else if (Array.isArray(valor)) {
      for (const item of valor) {
        const hijo: Contexto =
          item !== null && typeof item === 'object'
            ? { ...ctx, ...(item as Contexto) }
            : { ...ctx };
        salida += renderTemplate(inner, hijo);
      }
    }

    resto = resto.slice(fin);
  }

  salida += interpolar(resto, ctx);
  return salida;
}

// ─── Construcción del contexto del documento ──────────────────────────────────

function construirContexto(doc: DocumentoParaPdf, tipo: TipoDocumento): Contexto {
  const appConfig = getAppConfig();
  const profileConfig = getProfileConfig();

  const empresa = appConfig.empresa ?? ({} as AppConfig['empresa']);
  const footerTexto =
    tipo === 'factura'
      ? (profileConfig.footer?.factura ?? '')
      : (profileConfig.footer?.presupuesto ?? '');

  const tituloDoc = tipo === 'factura' ? 'FACTURA' : 'PRESUPUESTO';
  const mostrarIva = tipo === 'factura';
  const ivaPct = doc.totales.iva_porcentaje ?? doc.iva_porcentaje ?? 0;
  const logo = logoSrc(empresa.logo);

  return {
    STYLES: leerCss(),
    titulo_doc: tituloDoc,
    etiqueta_numero: tipo === 'factura' ? 'Nº Factura:' : 'Nº Presupuesto:',
    numero: doc.numero ?? 'BORRADOR',
    mostrar_sello: tipo === 'factura' && doc.estado === 'pagada',

    has_logo: Boolean(logo),
    logo,
    empresa_nombre: empresa.nombre ?? '',
    empresa_cif: empresa.cif ?? '',
    empresa_direccion: empresa.direccion ?? '',
    empresa_email: empresa.email ?? '',
    empresa_telefono: empresa.telefono ?? '',

    cliente_nombre: doc.cliente_empresa || doc.cliente_nombre || '',
    cliente_dni_cif: doc.cliente_dni_cif ?? '',
    cliente_direccion: doc.cliente_direccion ?? doc.agrupador_label ?? '',
    fecha: fmtFecha(doc.fecha),

    lineas: doc.lineas.map(l => ({
      descripcion: l.descripcion ?? '',
      cantidad: fmt(l.cantidad),
      unidad: l.unidad ?? '',
      precio: `${fmt(l.precio_unitario)} €`,
      importe: `${fmt(l.cantidad * l.precio_unitario)} €`,
    })),

    mostrar_iva: mostrarIva,
    iva_pct: ivaPct,
    iva_importe: `${fmt(doc.totales.iva ?? 0)} €`,
    subtotal: `${fmt(doc.totales.subtotal)} €`,
    total: `${fmt(doc.totales.total)} €`,
    mostrar_nota_iva: tipo === 'presupuesto',

    notas: doc.notas ?? '',
    footer: footerTexto,
  };
}

function buildHtml(doc: DocumentoParaPdf, tipo: TipoDocumento): string {
  return renderTemplate(cargarPlantilla(), construirContexto(doc, tipo));
}

// ─── Lanzador de navegador (Chromium incluido o Edge del sistema) ─────────────

function encontrarEdge(): string | undefined {
  const candidatos = [
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const ruta of candidatos) {
    try {
      if (fs.existsSync(ruta)) return ruta;
    } catch {
      /* ignorar */
    }
  }
  return undefined;
}

async function lanzarNavegador() {
  const baseArgs = ['--no-sandbox', '--disable-setuid-sandbox'];

  const lanzarBundled = () =>
    puppeteer.launch({ headless: true, args: baseArgs });

  const lanzarEdge = () => {
    const edgePath = encontrarEdge();
    if (!edgePath) {
      throw new Error('No se encontró Microsoft Edge instalado en el sistema');
    }
    return puppeteer.launch({ headless: true, args: baseArgs, executablePath: edgePath });
  };

  const modo = getAppConfig().sistema?.chromium_modo === 'edge' ? 'edge' : 'bundled';
  const primario = modo === 'edge' ? lanzarEdge : lanzarBundled;
  const secundario = modo === 'edge' ? lanzarBundled : lanzarEdge;
  const nombrePrimario = modo === 'edge' ? 'Edge del sistema' : 'Chromium incluido';
  const nombreSecundario = modo === 'edge' ? 'Chromium incluido' : 'Edge del sistema';

  try {
    const browser = await primario();
    console.log(`[pdf] Generando PDF con ${nombrePrimario}`);
    return browser;
  } catch (err) {
    console.warn(
      `[pdf] Falló ${nombrePrimario} (${(err as Error).message}); probando ${nombreSecundario}`
    );
    const browser = await secundario();
    console.log(`[pdf] Generando PDF con ${nombreSecundario} (fallback)`);
    return browser;
  }
}

// ─── Generar PDF ──────────────────────────────────────────────────────────────

export async function generarPdf(
  doc: DocumentoParaPdf,
  tipo: TipoDocumento
): Promise<string> {
  const html = buildHtml(doc, tipo);
  const nombre = `${tipo}-${doc.id}-${Date.now()}.pdf`;
  const outputPath = path.join(dirPdfs(), nombre);

  const browser = await lanzarNavegador();

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ["load", "domcontentloaded"]
    });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }

  return path.relative(__dirname, outputPath);
}