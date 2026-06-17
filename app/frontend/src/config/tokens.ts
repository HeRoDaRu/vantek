/**
 * ──────────────────────────────────────────────────────────────────────────────
 * tokens.ts — Central registry of template tokens (PDF + email)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Frontend help registry listing every {{token}} usable in PDF and email
 *   templates, with a description and the backend file (`origen`) where each
 *   value is actually resolved. Powers the help lists shown in Configuración
 *   and serves as the developer index of available tokens.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · (none)
 *   Used by:
 *     · ConfigPage (Templates / Email sections) → renders token help lists
 *   Mirrors (value resolution, backend):
 *     · email.service.ts (renderPlantilla) → email tokens
 *     · pdf.service.ts → PDF interpolations and block engine
 *
 * EXPORTS
 *   · Token → interface { token, desc, origen }
 *   · TOKENS_EMAIL → email subject/body tokens
 *   · TOKENS_PDF → simple PDF interpolation tokens
 *   · BLOQUES_PDF → PDF block tokens (#each / #if conditionals & loops)
 *
 * INPUTS / OUTPUTS
 *   Input:  (none) — static data
 *   Output: arrays of Token descriptors for the UI
 *
 * NOTES
 *   · This file is only the help list; adding a real token also requires wiring
 *     the value in the corresponding backend `origen` service.
 * ──────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO CENTRAL DE TOKENS / VARIABLES DE PLANTILLAS
// ─────────────────────────────────────────────────────────────────────────────
// Mapa único de todas las variables {{token}} reemplazables de la aplicación.
// Sirve para dos cosas:
//   1. Alimentar las listas de ayuda que ve el usuario en Configuración.
//   2. Ser el "índice para el desarrollador": ante una petición de cambio,
//      aquí está QUÉ tokens existen y DÓNDE se rellena su valor en el código.
//
// IMPORTANTE: este fichero es la lista de ayuda (frontend). El VALOR de cada
// token se calcula en el backend, en los ficheros indicados en `origen`.
// Si añades un token nuevo, hay que tocar AMBOS sitios:
//   · este registro (para que aparezca en la ayuda), y
//   · el backend `origen` (para que el token se rellene de verdad).
//
// Contextos y dónde se resuelven los valores:
//   · email      → app/backend/src/services/email.service.ts  (renderPlantilla)
//   · pdf        → app/backend/src/services/pdf.service.ts     (construye el contexto)
// ─────────────────────────────────────────────────────────────────────────────

export interface Token {
  /** Token tal cual se escribe en la plantilla, ej. '{{empresa}}'. */
  token: string;
  /** Descripción para el usuario. */
  desc: string;
  /** Fichero del backend donde se rellena el valor (referencia para el desarrollador). */
  origen: string;
}

// ─── Email (asunto y cuerpo de facturas y presupuestos) ───────────────────────
// Valores resueltos en: app/backend/src/services/email.service.ts
export const TOKENS_EMAIL: Token[] = [
  { token: '{{empresa}}', desc: 'Nombre de la empresa (Configuración → Empresa)', origen: 'email.service.ts' },
  { token: '{{cliente}}', desc: 'Nombre del cliente del documento', origen: 'email.service.ts' },
  { token: '{{obra}}', desc: 'Nombre de la obra / trabajo', origen: 'email.service.ts' },
  { token: '{{numero}}', desc: 'Nº de factura (los presupuestos no llevan número: usa {{obra}})', origen: 'email.service.ts' },
];

// ─── PDF — interpolaciones simples ────────────────────────────────────────────
// Valores resueltos en: app/backend/src/services/pdf.service.ts
export const TOKENS_PDF: Token[] = [
  { token: '{{{STYLES}}}', desc: 'CSS de la plantilla (insertar dentro de <style>)', origen: 'pdf.service.ts' },
  { token: '{{titulo_doc}}', desc: 'FACTURA o PRESUPUESTO', origen: 'pdf.service.ts' },
  { token: '{{etiqueta_numero}}', desc: '«Nº Factura:» o «Nº Presupuesto:»', origen: 'pdf.service.ts' },
  { token: '{{numero}}', desc: 'Número del documento (o BORRADOR)', origen: 'pdf.service.ts' },
  { token: '{{{logo}}}', desc: 'Logo de la empresa (usar como src de <img>)', origen: 'pdf.service.ts' },
  { token: '{{empresa_nombre}}', desc: 'Nombre o razón social', origen: 'pdf.service.ts' },
  { token: '{{empresa_cif}}', desc: 'CIF / NIF', origen: 'pdf.service.ts' },
  { token: '{{empresa_direccion}}', desc: 'Dirección fiscal', origen: 'pdf.service.ts' },
  { token: '{{empresa_email}}', desc: 'Email de empresa', origen: 'pdf.service.ts' },
  { token: '{{empresa_telefono}}', desc: 'Teléfono', origen: 'pdf.service.ts' },
  { token: '{{cliente_nombre}}', desc: 'Nombre del cliente', origen: 'pdf.service.ts' },
  { token: '{{cliente_dni_cif}}', desc: 'DNI / CIF del cliente', origen: 'pdf.service.ts' },
  { token: '{{cliente_direccion}}', desc: 'Dirección de la obra', origen: 'pdf.service.ts' },
  { token: '{{fecha}}', desc: 'Fecha (ej. «22 de Enero 2025»)', origen: 'pdf.service.ts' },
  { token: '{{subtotal}}', desc: 'Subtotal con € (ej. «6.907,00 €»)', origen: 'pdf.service.ts' },
  { token: '{{iva_pct}}', desc: 'Porcentaje de IVA', origen: 'pdf.service.ts' },
  { token: '{{iva_importe}}', desc: 'Importe del IVA con €', origen: 'pdf.service.ts' },
  { token: '{{total}}', desc: 'Total con €', origen: 'pdf.service.ts' },
  { token: '{{notas}}', desc: 'Notas del documento', origen: 'pdf.service.ts' },
  { token: '{{footer}}', desc: 'Pie de página configurado', origen: 'pdf.service.ts' },
];

// ─── PDF — bloques (condicionales y bucles) ───────────────────────────────────
// Motor de bloques en: app/backend/src/services/pdf.service.ts
export const BLOQUES_PDF: Token[] = [
  { token: '{{#each lineas}} … {{/each}}', desc: 'Repite por cada línea. Dentro: {{descripcion}}, {{cantidad}}, {{unidad}}, {{precio}}, {{importe}}', origen: 'pdf.service.ts' },
  { token: '{{#if mostrar_iva}} … {{/if}}', desc: 'Solo en facturas (fila de IVA)', origen: 'pdf.service.ts' },
  { token: '{{#if mostrar_nota_iva}} … {{/if}}', desc: 'Solo en presupuestos (aviso de IVA aparte)', origen: 'pdf.service.ts' },
  { token: '{{#if mostrar_sello}} … {{/if}}', desc: 'Solo facturas pagadas (sello PAGADA)', origen: 'pdf.service.ts' },
  { token: '{{#if has_logo}} … {{else}} … {{/if}}', desc: 'Según haya logo o no', origen: 'pdf.service.ts' },
  { token: '{{#if cliente_dni_cif}} … {{/if}}', desc: 'Solo si el cliente tiene DNI/CIF', origen: 'pdf.service.ts' },
];
