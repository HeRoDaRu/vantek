import { Router } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import * as svc from '@services/presupuestos.service';
import { generarPdf } from '@services/pdf.service';
import { guardarVersion } from '@services/presupuestos.service';

const router = Router();

// Listado
router.get('/', asyncHandler(async (req, res) => {
  const { trabajo_id, estado, cliente_id } = req.query as Record<string, string>;
  const datos = await svc.listarPresupuestos({ trabajo_id, estado: estado as svc.EstadoPresupuesto, cliente_id });
  res.json(datos);
}));

// Detalle
router.get('/:id', asyncHandler(async (req, res) => {
  const datos = await svc.obtenerPresupuesto(req.params.id);
  if (!datos) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  res.json(datos);
}));

// Crear
router.post('/', asyncHandler(async (req, res) => {
  const { trabajo_id, fecha, notas, lineas } = req.body;
  if (!trabajo_id) return res.status(400).json({ error: 'trabajo_id es obligatorio' });
  const datos = await svc.crearPresupuesto({ trabajo_id, fecha, notas, lineas });
  res.status(201).json(datos);
}));

// Actualizar cabecera
router.put('/:id', asyncHandler(async (req, res) => {
  const { notas, fecha } = req.body;
  const datos = await svc.actualizarPresupuesto(req.params.id, { notas, fecha });
  res.json(datos);
}));

// Guardar líneas (save explícito)
router.put('/:id/lineas', asyncHandler(async (req, res) => {
  const { lineas } = req.body;
  if (!Array.isArray(lineas)) return res.status(400).json({ error: 'lineas debe ser un array' });
  await svc.guardarLineas(req.params.id, lineas);
  const datos = await svc.obtenerPresupuesto(req.params.id);
  res.json(datos);
}));

// Autoguardado de borrador
router.post('/:id/borrador', asyncHandler(async (req, res) => {
  await svc.guardarBorrador(req.params.id, req.body);
  res.json({ ok: true });
}));

// Cambiar estado
router.post('/:id/estado', asyncHandler(async (req, res) => {
  const { estado } = req.body;
  if (!estado) return res.status(400).json({ error: 'estado es obligatorio' });
  const datos = await svc.cambiarEstado(req.params.id, estado);
  res.json(datos);
}));

// Generar PDF y guardar versión
router.post('/:id/pdf', asyncHandler(async (req, res) => {
  const presupuesto = await svc.obtenerPresupuesto(req.params.id);
  if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });

  const pdfPath = await generarPdf(presupuesto, 'presupuesto');
  const version = await guardarVersion(req.params.id, pdfPath);

  res.json({ ok: true, pdf_path: pdfPath, version });
}));

// Servir PDF por path relativo
router.get('/:id/pdf/latest', asyncHandler(async (req, res) => {
  const presupuesto = await svc.obtenerPresupuesto(req.params.id);
  if (!presupuesto || !presupuesto.versiones.length) {
    return res.status(404).json({ error: 'Sin PDF disponible' });
  }
  const ultima = presupuesto.versiones[0] as { pdf_path: string };
  res.sendFile(ultima.pdf_path, { root: __dirname });
}));

// Eliminar
router.delete('/:id', asyncHandler(async (req, res) => {
  await svc.eliminarPresupuesto(req.params.id);
  res.json({ ok: true });
}));

export default router;