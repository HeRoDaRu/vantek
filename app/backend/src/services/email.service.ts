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

function crearTransporter() {
  const config = getAppConfig();
  const smtp = config.email?.smtp;
  const auth = config.email?.auth;

  if (!smtp?.host) throw new Error('SMTP no configurado en app.config.json');

  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port ?? 587,
    secure: smtp.secure ?? false,
    auth: auth?.user ? { user: auth.user, pass: auth.pass } : undefined,
  });
}

export async function enviarFactura(
  factura: {
    numero?: string | null;
    cliente_nombre?: string;
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
  const email = config.empresa?.email ?? config.email?.auth?.user;

  const adjuntos = adjuntoPdf(factura.versiones, `Factura-${numero}.pdf`);

  await transporter.sendMail({
    from: `"${empresa}" <${email}>`,
    to: emailDestino,
    subject: `Factura ${numero} — ${empresa}`,
    text: `Estimado/a ${clienteNombre},\n\nAdjuntamos la factura ${numero}.\n\nUn saludo,\n${empresa}`,
    html: `
      <p>Estimado/a <strong>${clienteNombre}</strong>,</p>
      <p>Adjuntamos la factura <strong>${numero}</strong>.</p>
      <br>
      <p>Un saludo,<br><strong>${empresa}</strong></p>
    `,
    attachments: adjuntos,
  });
}

export async function enviarPresupuesto(
  presupuesto: {
    numero?: string | null;
    cliente_nombre?: string;
    versiones: { pdf_path: string }[];
    [key: string]: unknown;
  },
  emailDestino: string
): Promise<void> {
  const config = getAppConfig();
  const transporter = crearTransporter();

  const empresa = config.empresa?.nombre ?? 'Vantek';
  const numero = presupuesto.numero ?? 'borrador';
  const clienteNombre = presupuesto.cliente_nombre ?? '';
  const email = config.empresa?.email ?? config.email?.auth?.user;

  const adjuntos = adjuntoPdf(presupuesto.versiones, `Presupuesto-${numero}.pdf`);

  await transporter.sendMail({
    from: `"${empresa}" <${email}>`,
    to: emailDestino,
    subject: `Presupuesto ${numero} — ${empresa}`,
    text: `Estimado/a ${clienteNombre},\n\nAdjuntamos el presupuesto ${numero}.\n\nUn saludo,\n${empresa}`,
    html: `
      <p>Estimado/a <strong>${clienteNombre}</strong>,</p>
      <p>Adjuntamos el presupuesto <strong>${numero}</strong>.</p>
      <br>
      <p>Un saludo,<br><strong>${empresa}</strong></p>
    `,
    attachments: adjuntos,
  });
}