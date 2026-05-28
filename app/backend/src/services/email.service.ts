import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { getAppConfig } from '@utils/config';

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
  const smtp = config.email?.smtp;

  if (!smtp) throw new Error('SMTP no configurado en app.config.json');

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port ?? 587,
    secure: smtp.secure ?? false,
    auth: smtp.user
      ? { user: smtp.user, pass: smtp.pass }
      : undefined,
  });

  const empresa = config.empresa?.nombre ?? 'Vantek';
  const numero = factura.numero ?? 'borrador';
  const clienteNombre = factura.cliente_nombre ?? '';

  // Adjuntar la última versión del PDF si existe
  const adjuntos: nodemailer.Attachment[] = [];
  if (factura.versiones?.length) {
    const ultima = factura.versiones[0] as { pdf_path: string };
    const pdfAbs = path.join(process.cwd(), ultima.pdf_path);
    if (fs.existsSync(pdfAbs)) {
      adjuntos.push({
        filename: `Factura-${numero}.pdf`,
        path: pdfAbs,
        contentType: 'application/pdf',
      });
    }
  }

  await transporter.sendMail({
    from: `"${empresa}" <${smtp.from ?? smtp.user}>`,
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