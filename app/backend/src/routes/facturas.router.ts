import { Router } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import * as svc from '@services/facturas.service';
import { generarPdf } from '@services/pdf.service';
import { enviarFactura } from '@services/email.service';

const router = Router();

// Listado
router.get('/', asyncHandler(async (req, res) => {
  const { trabajo_id, estado, cliente_id } = req.query as Record<string, string>;
  const datos = await svc.listarFacturas({
    trabajo_id,
    estado: estado as svc.EstadoFactura,
    cliente_id,
  });
  res.json(datos);
}));

// Detalle
router.get('/:id', asyncHandler(async (req, res) => {
  const datos = await svc.obtenerFactura(req.params.id);
  if (!datos) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json(datos);
}));

// Crear
router.post('/', asyncHandler(async (req, res) => {
  const { trabajo_id, fecha, notas, presupuesto_origen_id, lineas } = req.body;
  if (!trabajo_id) return res.status(400).json({ error: 'trabajo_id es obligatorio' });
  const datos = await svc.crearFactura({
    trabajo_id, fecha, notas, presupuesto_origen_id, lineas,
  });
  res.status(201).json(datos);
}));

// Guardar líneas
router.put('/:id/lineas', asyncHandler(async (req, res) => {
  const { lineas } = req.body;
  if (!Array.isArray(lineas)) return res.status(400).json({ error: 'lineas debe ser un array' });
  await svc.guardarLineas(req.params.id, lineas);
  const datos = await svc.obtenerFactura(req.params.id);
  res.json(datos);
}));

// Autoguardado
router.post('/:id/borrador', asyncHandler(async (req, res) => {
  await svc.guardarBorrador(req.params.id, req.body);
  res.json({ ok: true });
}));

// Cerrar factura (con verificaciones)
router.post('/:id/cerrar', asyncHandler(async (req, res) => {
  const resultado = await svc.cerrarFactura(req.params.id);

  if (!resultado.ok && resultado.bloqueante) {
    return res.status(422).json({ error: resultado.bloqueante, bloqueante: true });
  }

  // Si hay aviso pero no es bloqueante, lo incluimos en la respuesta
  res.json(resultado);
}));

// Cambiar estado (entregada, pendiente_pago, pagada, borrador para reabrir)
router.post('/:id/estado', asyncHandler(async (req, res) => {
  const { estado } = req.body;
  if (!estado) return res.status(400).json({ error: 'estado es obligatorio' });
  const datos = await svc.cambiarEstado(req.params.id, estado);
  res.json(datos);
}));

// Generar PDF y versión
router.post('/:id/pdf', asyncHandler(async (req, res) => {
  const factura = await svc.obtenerFactura(req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

  const pdfPath = await generarPdf(factura, 'factura');
  const version = await svc.guardarVersion(req.params.id, pdfPath);

  res.json({ ok: true, pdf_path: pdfPath, version });
}));

// Servir PDF
router.get('/:id/pdf/latest', asyncHandler(async (req, res) => {
  const factura = await svc.obtenerFactura(req.params.id);
  if (!factura || !factura.versiones.length) {
    return res.status(404).json({ error: 'Sin PDF disponible' });
  }
  const ultima = factura.versiones[0] as { pdf_path: string };
  res.sendFile(ultima.pdf_path, { root: process.cwd() });
}));

// Enviar por email
router.post('/:id/enviar', asyncHandler(async (req, res) => {
  const { email_destino } = req.body;
  const factura = await svc.obtenerFactura(req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

  const dest = email_destino || (factura as Record<string, unknown>).cliente_email;
  if (!dest) return res.status(400).json({ error: 'No hay email de destino' });

  await enviarFactura(factura, dest as string);
  await svc.cambiarEstado(req.params.id, 'entregada');

  res.json({ ok: true });
}));

// Eliminar
router.delete('/:id', asyncHandler(async (req, res) => {
  await svc.eliminarFactura(req.params.id);
  res.json({ ok: true });
}));

export default router;