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
 *
 * DEVELOPER INDEX
 *   This registry is also the developer index: when a change is requested, here
 *   is WHICH tokens exist and WHERE their value is filled in the code.
 *   If you add a new token, you must touch BOTH places:
 *     · this registry (so it shows up in the help), and
 *     · the backend `origen` (so the token is actually filled).
 *
 *   Contexts and where the values are resolved:
 *     · email → app/backend/src/services/email.service.ts  (renderPlantilla)
 *     · pdf   → app/backend/src/services/pdf.service.ts     (builds the context)
 * ──────────────────────────────────────────────────────────────────────────────
 */

export interface Token {
  /** Token exactly as written in the template, e.g. '{{empresa}}'. */
  token: string;
  /** Description for the user. */
  desc: string;
  /**
   * Exact location in the backend where the token value is computed, in the
   * format `path/to/file.ts → function()`. It is the direct reference for the
   * developer: that is where the code that fills this token lives, without
   * having to search the file tree for it.
   */
  origen: string;
}

// ─── Email (subject and body of invoices and quotes) ──────────────────────────
// Substitution engine: app/backend/src/services/email.service.ts → renderPlantilla()
// The token map is built in enviarFactura() / enviarPresupuesto() (same file)
// and applied with renderPlantilla(plantilla, tokens).
export const TOKENS_EMAIL: Token[] = [
  { token: '{{empresa}}', desc: 'Nombre de la empresa (Configuración → Empresa)', origen: 'app/backend/src/services/email.service.ts → enviarFactura()/enviarPresupuesto() (config.empresa.nombre)' },
  { token: '{{cliente}}', desc: 'Nombre del cliente del documento', origen: 'app/backend/src/services/email.service.ts → enviarFactura()/enviarPresupuesto() (doc.cliente_nombre)' },
  { token: '{{obra}}', desc: 'Nombre de la obra / trabajo', origen: 'app/backend/src/services/email.service.ts → enviarFactura()/enviarPresupuesto() (doc.trabajo_nombre)' },
  { token: '{{numero}}', desc: 'Nº de factura (los presupuestos no llevan número: usa {{obra}})', origen: 'app/backend/src/services/email.service.ts → enviarFactura() (doc.numero)' },
];

// ─── PDF — simple interpolations ──────────────────────────────────────────────
// All values are computed in app/backend/src/services/pdf.service.ts inside
// construirContexto() (the context object that renderTemplate() interpolates),
// except the logo and the CSS, which have their own helper (logoSrc()/leerCss()).
export const TOKENS_PDF: Token[] = [
  { token: '{{{STYLES}}}', desc: 'CSS de la plantilla (insertar dentro de <style>)', origen: 'app/backend/src/services/pdf.service.ts → leerCss() (asignado en construirContexto().STYLES)' },
  { token: '{{titulo_doc}}', desc: 'FACTURA o PRESUPUESTO', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (titulo_doc)' },
  { token: '{{etiqueta_numero}}', desc: '«Nº Factura:» o «Nº Presupuesto:»', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (etiqueta_numero)' },
  { token: '{{numero}}', desc: 'Número del documento (o BORRADOR)', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (numero)' },
  { token: '{{{logo}}}', desc: 'Logo de la empresa (usar como src de <img>)', origen: 'app/backend/src/services/pdf.service.ts → logoSrc() (asignado en construirContexto().logo)' },
  { token: '{{empresa_nombre}}', desc: 'Nombre o razón social', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (empresa_nombre)' },
  { token: '{{empresa_cif}}', desc: 'CIF / NIF', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (empresa_cif)' },
  { token: '{{empresa_direccion}}', desc: 'Dirección fiscal', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (empresa_direccion)' },
  { token: '{{empresa_email}}', desc: 'Email de empresa', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (empresa_email)' },
  { token: '{{empresa_telefono}}', desc: 'Teléfono', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (empresa_telefono)' },
  { token: '{{cliente_nombre}}', desc: 'Nombre del cliente', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (cliente_nombre)' },
  { token: '{{cliente_dni_cif}}', desc: 'DNI / CIF del cliente', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (cliente_dni_cif)' },
  { token: '{{cliente_direccion}}', desc: 'Dirección de la obra', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (cliente_direccion)' },
  { token: '{{fecha}}', desc: 'Fecha (ej. «22 de Enero 2025»)', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (fecha, vía fmtFecha())' },
  { token: '{{subtotal}}', desc: 'Subtotal con € (ej. «6.907,00 €»)', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (subtotal, vía fmt())' },
  { token: '{{iva_pct}}', desc: 'Porcentaje de IVA', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (iva_pct)' },
  { token: '{{iva_importe}}', desc: 'Importe del IVA con €', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (iva_importe, vía fmt())' },
  { token: '{{total}}', desc: 'Total con €', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (total, vía fmt())' },
  { token: '{{notas}}', desc: 'Notas del documento', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (notas)' },
  { token: '{{footer}}', desc: 'Pie de página configurado', origen: 'app/backend/src/services/pdf.service.ts → construirContexto() (footer)' },
];

// ─── PDF — blocks (conditionals and loops) ────────────────────────────────────
// The {{#each}}/{{#if}}/{{else}} engine lives in app/backend/src/services/pdf.service.ts
// → renderTemplate() (the mini template engine function). The flags and the list
// the blocks consume are computed in construirContexto() (same file).
export const BLOQUES_PDF: Token[] = [
  { token: '{{#each lineas}} … {{/each}}', desc: 'Repite por cada línea. Dentro: {{descripcion}}, {{cantidad}}, {{unidad}}, {{precio}}, {{importe}}', origen: 'app/backend/src/services/pdf.service.ts → renderTemplate() (motor) · lista en construirContexto() (lineas[])' },
  { token: '{{#if mostrar_iva}} … {{/if}}', desc: 'Solo en facturas (fila de IVA)', origen: 'app/backend/src/services/pdf.service.ts → renderTemplate() (motor) · bandera en construirContexto() (mostrar_iva)' },
  { token: '{{#if mostrar_nota_iva}} … {{/if}}', desc: 'Solo en presupuestos (aviso de IVA aparte)', origen: 'app/backend/src/services/pdf.service.ts → renderTemplate() (motor) · bandera en construirContexto() (mostrar_nota_iva)' },
  { token: '{{#if mostrar_sello}} … {{/if}}', desc: 'Solo facturas pagadas (sello PAGADA)', origen: 'app/backend/src/services/pdf.service.ts → renderTemplate() (motor) · bandera en construirContexto() (mostrar_sello)' },
  { token: '{{#if has_logo}} … {{else}} … {{/if}}', desc: 'Según haya logo o no', origen: 'app/backend/src/services/pdf.service.ts → renderTemplate() (motor) · bandera en construirContexto() (has_logo)' },
  { token: '{{#if cliente_dni_cif}} … {{/if}}', desc: 'Solo si el cliente tiene DNI/CIF', origen: 'app/backend/src/services/pdf.service.ts → renderTemplate() (motor) · valor en construirContexto() (cliente_dni_cif)' },
];
