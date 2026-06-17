/**
 * ──────────────────────────────────────────────────────────────────────────────
 * email.service.ts — Envío de facturas, presupuestos e informes por SMTP
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Email layer via Nodemailer. Builds the SMTP transporter from the
 *   configuration, renders subject/body with {{key}} tokens, attaches the
 *   document's latest PDF and sends facturas, presupuestos and error reports.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · nodemailer (+ Attachment) → SMTP transport and attachments
 *     · path, fs → resolution and existence of the PDF file
 *     · @utils/config (getAppConfig) → SMTP, empresa and email templates
 *     · @utils/paths (PDFS_DIR) → canonical directory of generated PDFs
 *   Used by:
 *     · routes/facturas.router.ts → POST /api/facturas/:id/enviar
 *     · routes/config.router.ts → "Test connection" SMTP / error report
 *
 * EXPORTS
 *   · verificarSmtp(override?) → validates SMTP connection/credentials
 *   · enviarFactura(factura, emailDestino) → sends the factura with its PDF
 *   · enviarPresupuesto(presupuesto, emailDestino) → sends the presupuesto with its PDF
 *   · enviarErrores(errores, emailDestino, rango?) → error report to the technician
 *
 * INPUTS / OUTPUTS
 *   Input:  documento + versions (with pdf_path), destination email, SMTP config
 *   Output: Promise<void>; side effect = email sent
 *
 * NOTES
 *   · The PDF is re-resolved from PDFS_DIR by basename (pdf_path values may be relative).
 *   · secure=true → direct SSL (465); secure=false → forced STARTTLS (587).
 *   · Template token catalog: app/frontend/src/config/tokens.ts.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import nodemailer from 'nodemailer';
import { Attachment } from 'nodemailer/lib/mailer';
import path from 'path';
import fs from 'fs';
import { getAppConfig } from '@utils/config';
import { PDFS_DIR } from '@utils/paths';

// Resuelve el adjunto PDF (última versión) de un documento de forma robusta:
// los pdf_path almacenados pueden ser relativos (con ../) según el despliegue,
// así que siempre se reconstruye desde PDFS_DIR con el nombre de fichero.
function adjuntoPdf(
  versiones: { pdf_path: string }[] | undefined,
  filename: string
): Attachment[] {
  if (!versiones?.length) return [];
  const ultima = versiones[0] as { pdf_path: string };
  const pdfAbs = path.join(PDFS_DIR, path.basename(ultima.pdf_path));
  if (!fs.existsSync(pdfAbs)) return [];
  return [{ filename, path: pdfAbs, contentType: 'application/pdf' }];
}

interface SmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

function crearTransporter(override?: SmtpConfig) {
  const config = getAppConfig();
  const smtp = override ?? config.email?.smtp;

  if (!smtp?.host) throw new Error('SMTP no configurado en app.config.json');

  const port = smtp.port ?? 587;
  // secure=true → conexión SSL/TLS directa (normalmente puerto 465).
  // secure=false → conexión en claro que se eleva a STARTTLS (normalmente 587).
  const secure = smtp.secure ?? port === 465;

  return nodemailer.createTransport({
    host: smtp.host,
    port,
    secure,
    // Fuerza STARTTLS cuando no es conexión SSL directa: Gmail/Apple/Outlook
    // rechazan el envío sin cifrado en el puerto 587.
    requireTLS: !secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
}

// Resuelve la dirección remitente: prioriza el "From" configurado en SMTP,
// luego el email de empresa y, como último recurso, el usuario SMTP.
function resolverFrom(): string {
  const config = getAppConfig();
  const empresa = config.empresa?.nombre ?? 'Vantek';
  const from = config.email?.smtp?.from?.trim();
  if (from) return from;
  const email = config.empresa?.email || config.email?.smtp?.user || '';
  return email ? `"${empresa}" <${email}>` : `"${empresa}"`;
}

// Comprueba que el servidor SMTP acepta la conexión y las credenciales.
// Lo usa el botón "Probar conexión" de la pantalla de Configuración.
// Acepta una config SMTP opcional para probar los valores del formulario
// antes de guardarlos; si no se pasa, usa la configuración persistida.
export async function verificarSmtp(override?: SmtpConfig): Promise<void> {
  const transporter = crearTransporter(override);
  await transporter.verify();
}

// Sustituye tokens {{clave}} en una plantilla por sus valores.
// Tokens disponibles: numero, cliente, empresa, obra, tipo.
// Catálogo central de tokens (para la ayuda de la UI): app/frontend/src/config/tokens.ts
function renderPlantilla(plantilla: string, tokens: Record<string, string>): string {
  return plantilla.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, clave) => tokens[clave] ?? '');
}

// Escapa HTML y convierte saltos de línea en <br> para el cuerpo HTML.
function textoAHtml(texto: string): string {
  const escapado = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escapado.replace(/\n/g, '<br>');
}

export async function enviarFactura(
  factura: {
    numero?: string | null;
    cliente_nombre?: string;
    trabajo_nombre?: string;
    versiones: { pdf_path: string }[];
    [key: string]: unknown;
  },
  emailDestino: string
): Promise<void> {
  const config = getAppConfig();
  const transporter = crearTransporter();

  const empresa = config.empresa?.nombre ?? 'Vantek';
  const numero = factura.numero ?? 'borrador';
  const clienteNombre = factura.cliente_nombre ?? '';
  const obra = factura.trabajo_nombre ?? '';

  const tokens = { numero, cliente: clienteNombre, empresa, obra, tipo: 'factura' };
  const plantilla = config.email?.plantillas?.factura;
  const asunto = renderPlantilla(plantilla?.asunto || 'Factura {{numero}} — {{empresa}}', tokens);
  const cuerpo = renderPlantilla(
    plantilla?.cuerpo || 'Estimado/a {{cliente}},\n\nAdjuntamos la factura {{numero}}.\n\nUn saludo,\n{{empresa}}',
    tokens
  );

  const adjuntos = adjuntoPdf(factura.versiones, `Factura-${numero}.pdf`);

  await transporter.sendMail({
    from: resolverFrom(),
    to: emailDestino,
    subject: asunto,
    text: cuerpo,
    html: textoAHtml(cuerpo),
    attachments: adjuntos,
  });
}

export async function enviarPresupuesto(
  presupuesto: {
    numero?: string | null;
    cliente_nombre?: string;
    trabajo_nombre?: string;
    versiones: { pdf_path: string }[];
    [key: string]: unknown;
  },
  emailDestino: string
): Promise<void> {
  const config = getAppConfig();
  const transporter = crearTransporter();

  const empresa = config.empresa?.nombre ?? 'Vantek';
  // Los presupuestos no llevan número asignado; usamos la obra como referencia.
  const obra = presupuesto.trabajo_nombre ?? '';
  const numero = presupuesto.numero ?? obra;
  const clienteNombre = presupuesto.cliente_nombre ?? '';

  const tokens = { numero, cliente: clienteNombre, empresa, obra, tipo: 'presupuesto' };
  const plantilla = config.email?.plantillas?.presupuesto;
  const asunto = renderPlantilla(plantilla?.asunto || 'Presupuesto — {{obra}}', tokens);
  const cuerpo = renderPlantilla(
    plantilla?.cuerpo || 'Estimado/a {{cliente}},\n\nAdjuntamos el presupuesto solicitado para {{obra}}.\n\nUn saludo,\n{{empresa}}',
    tokens
  );

  const nombreArchivo = obra ? `Presupuesto-${obra}.pdf` : 'Presupuesto.pdf';
  const adjuntos = adjuntoPdf(presupuesto.versiones, nombreArchivo);

  await transporter.sendMail({
    from: resolverFrom(),
    to: emailDestino,
    subject: asunto,
    text: cuerpo,
    html: textoAHtml(cuerpo),
    attachments: adjuntos,
  });
}

// Envía un informe con los errores acumulados al técnico.
export async function enviarErrores(
  errores: {
    mensaje: string;
    stack: string | null;
    ruta: string | null;
    metodo: string | null;
    status: number | null;
    created_at: string;
  }[],
  emailDestino: string,
  rango?: { desde?: string; hasta?: string }
): Promise<void> {
  const config = getAppConfig();
  const transporter = crearTransporter();
  const empresa = config.empresa?.nombre ?? 'Vantek';

  const periodo = rango?.desde || rango?.hasta
    ? ` (${rango?.desde ?? '—'} a ${rango?.hasta ?? '—'})`
    : '';

  const lineasTexto = errores
    .map(e => `[${e.created_at}] ${e.metodo ?? ''} ${e.ruta ?? ''} — ${e.mensaje}\n${e.stack ?? ''}`)
    .join('\n\n');

  const filasHtml = errores
    .map(
      e => `
      <tr>
        <td style="padding:6px;border:1px solid #ddd;white-space:nowrap;">${e.created_at}</td>
        <td style="padding:6px;border:1px solid #ddd;">${textoAHtml(`${e.metodo ?? ''} ${e.ruta ?? ''}`)}</td>
        <td style="padding:6px;border:1px solid #ddd;">${textoAHtml(e.mensaje)}</td>
      </tr>`
    )
    .join('');

  await transporter.sendMail({
    from: resolverFrom(),
    to: emailDestino,
    subject: `Informe de errores ${empresa}${periodo} — ${errores.length} error(es)`,
    text: `Informe de errores de ${empresa}${periodo}\n\n${lineasTexto || 'Sin errores en el rango.'}`,
    html: `
      <p>Informe de errores de <strong>${empresa}</strong>${periodo}.</p>
      <p>Total: <strong>${errores.length}</strong> error(es).</p>
      <table style="border-collapse:collapse;font-size:12px;font-family:monospace;">
        <thead>
          <tr>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Fecha</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Ruta</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Mensaje</th>
          </tr>
        </thead>
        <tbody>${filasHtml}</tbody>
      </table>
    `,
  });
}