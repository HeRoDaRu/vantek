import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { getAppConfig, getProfileConfig } from '@utils/config';

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
  const dir = path.join(__dirname, '..','..','data', 'pdfs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── Formateo ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Template HTML ────────────────────────────────────────────────────────────

function buildHtml(doc: DocumentoParaPdf, tipo: TipoDocumento): string {
  const appConfig = getAppConfig();
  const profileConfig = getProfileConfig();

  const empresa = appConfig.empresa ?? {};
  const footerTexto =
    tipo === 'factura'
      ? (profileConfig.footer?.factura ?? '')
      : (profileConfig.footer?.presupuesto ?? '');

  const marcaAgua = tipo === 'factura' ? 'FACTURA' : 'PRESUPUESTO';
  const mostrarSelloPagada = tipo === 'factura' && doc.estado === 'pagada';
  const mostrarIva = tipo === 'factura';

  const filas = doc.lineas
    .map(
      l => `
      <tr>
        <td class="desc">${l.descripcion}</td>
        <td class="num">${fmt(l.cantidad)}</td>
        <td class="num">${l.unidad ?? ''}</td>
        <td class="num">${fmt(l.precio_unitario)}</td>
        <td class="num">${fmt(l.cantidad * l.precio_unitario)}</td>
      </tr>`
    )
    .join('');

  const ivaFila = mostrarIva
    ? `<tr class="total-row">
         <td colspan="4" class="total-label">IVA (${doc.iva_porcentaje}%)</td>
         <td class="num">${fmt(doc.totales.iva ?? 0)}</td>
       </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 11px; color: #1a1a2e; background: #fff;
    padding: 28px 36px;
  }

  /* Marca de agua diagonal */
  .watermark {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font-size: 90px; font-weight: 900; letter-spacing: 0.1em;
    color: rgba(0,0,0,0.04); pointer-events: none; user-select: none;
    white-space: nowrap; z-index: 0;
  }

  /* Sello PAGADA */
  .sello-pagada {
    position: absolute; top: 60px; right: 36px;
    border: 4px solid #16a34a; border-radius: 6px;
    padding: 6px 14px; transform: rotate(-12deg);
    color: #16a34a; font-size: 22px; font-weight: 900;
    letter-spacing: 0.15em; opacity: 0.85;
  }

  /* Cabecera */
  .header { display: flex; justify-content: space-between; margin-bottom: 28px; position: relative; }
  .header-left { flex: 1; }
  .header-right { flex: 1; text-align: right; }
  .empresa-nombre { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .empresa-dato { color: #555; margin-bottom: 2px; }
  .doc-numero { font-size: 22px; font-weight: 800; color: #1e3a5f; margin-bottom: 4px; }
  .doc-fecha { color: #666; margin-bottom: 12px; }
  .cliente-nombre { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
  .cliente-dato { color: #555; margin-bottom: 2px; }

  /* Separador */
  hr { border: none; border-top: 2px solid #1e3a5f; margin: 0 0 20px; }

  /* Tabla de líneas */
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead tr { background: #1e3a5f; color: #fff; }
  thead th { padding: 7px 8px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  thead th.num { text-align: right; }
  tbody tr:nth-child(even) { background: #f7f9fc; }
  tbody td { padding: 6px 8px; border-bottom: 1px solid #e8edf3; vertical-align: top; }
  td.desc { width: 50%; }
  td.num { text-align: right; white-space: nowrap; }

  /* Totales */
  .totales { display: flex; justify-content: flex-end; }
  .totales-tabla { width: 260px; }
  .total-row td { padding: 4px 8px; }
  .total-label { text-align: right; color: #555; }
  .total-final td { font-size: 14px; font-weight: 800; color: #1e3a5f; border-top: 2px solid #1e3a5f; padding-top: 8px; }

  /* Notas */
  .notas { margin-top: 24px; padding: 12px 14px; background: #f7f9fc; border-left: 3px solid #1e3a5f; font-size: 10px; color: #555; }

  /* Footer */
  .footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #dde3ec; font-size: 9px; color: #888; text-align: center; }
</style>
</head>
<body>

<div class="watermark">${marcaAgua}</div>

${mostrarSelloPagada ? '<div class="sello-pagada">PAGADA</div>' : ''}

<div class="header">
  <div class="header-left">
    <div class="empresa-nombre">${empresa.nombre ?? ''}</div>
    <div class="empresa-dato">${empresa.cif ?? ''}</div>
    <div class="empresa-dato">${empresa.direccion ?? ''}</div>
    <div class="empresa-dato">${empresa.telefono ?? ''}</div>
    <div class="empresa-dato">${empresa.email ?? ''}</div>
  </div>
  <div class="header-right">
    <div class="doc-numero">${doc.numero ?? 'BORRADOR'}</div>
    <div class="doc-fecha">${doc.fecha}</div>
    <div class="cliente-nombre">${doc.cliente_nombre ?? ''} ${doc.cliente_empresa ? `· ${doc.cliente_empresa}` : ''}</div>
    <div class="cliente-dato">${doc.cliente_dni_cif ?? ''}</div>
    <div class="cliente-dato">${doc.agrupador_label ?? ''}</div>
    <div class="cliente-dato">${doc.cliente_direccion ?? ''}</div>
  </div>
</div>

<hr>

<table>
  <thead>
    <tr>
      <th class="desc">Descripción</th>
      <th class="num">Cant.</th>
      <th class="num">Ud.</th>
      <th class="num">Precio u.</th>
      <th class="num">Total</th>
    </tr>
  </thead>
  <tbody>${filas}</tbody>
</table>

<div class="totales">
  <table class="totales-tabla">
    <tr class="total-row">
      <td colspan="4" class="total-label">Subtotal</td>
      <td class="num">${fmt(doc.totales.subtotal)} €</td>
    </tr>
    ${ivaFila}
    <tr class="total-final">
      <td colspan="4" class="total-label">TOTAL</td>
      <td class="num">${fmt(doc.totales.total)} €</td>
    </tr>
  </table>
</div>

${doc.notas ? `<div class="notas">${doc.notas}</div>` : ''}

<div class="footer">${footerTexto}</div>

</body>
</html>`;
}

// ─── Generar PDF ──────────────────────────────────────────────────────────────

export async function generarPdf(
  doc: DocumentoParaPdf,
  tipo: TipoDocumento
): Promise<string> {
  const html = buildHtml(doc, tipo);
  const nombre = `${tipo}-${doc.id}-${Date.now()}.pdf`;
  const outputPath = path.join(dirPdfs(), nombre);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

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