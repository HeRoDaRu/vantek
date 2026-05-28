import { Router } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import { albanesService } from '@services/albaranes.service';

const router = Router();

// GET /api/albaranes?estado=&proveedor=&fecha_desde=&fecha_hasta=
router.get('/', asyncHandler(async (req, res) => {
  const { estado, proveedor, fecha_desde, fecha_hasta } = req.query;
  const albaranes = albanesService.findAll({
    estado: estado as any,
    proveedor: proveedor as string,
    fecha_desde: fecha_desde as string,
    fecha_hasta: fecha_hasta as string
  });
  res.json({ data: albaranes });
}));

// GET /api/albaranes/trabajo/:trabajoId — albaranes asignados a un trabajo
router.get('/trabajo/:trabajoId', asyncHandler(async (req, res) => {
  const albaranes = albanesService.findByTrabajo(req.params.trabajoId);
  res.json({ data: albaranes });
}));

// GET /api/albaranes/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const albaran = albanesService.findById(req.params.id);
  if (!albaran) return res.status(404).json({ error: 'Albarán no encontrado' });
  res.json({ data: albaran });
}));

// POST /api/albaranes
router.post('/', asyncHandler(async (req, res) => {
  const { proveedor_nombre, numero, fecha, notas, lineas } = req.body;
  if (!fecha) return res.status(400).json({ error: 'La fecha es obligatoria' });
  if (!lineas?.length) return res.status(400).json({ error: 'El albarán debe tener al menos una línea' });
  const albaran = albanesService.create({ proveedor_nombre, numero, fecha, notas, lineas });
  res.status(201).json({ data: albaran });
}));

// POST /api/albaranes/:id/asignar
// body: { trabajo_id, linea_ids? } — si no se pasan linea_ids, asigna todas
router.post('/:id/asignar', asyncHandler(async (req, res) => {
  const { trabajo_id, linea_ids } = req.body;
  if (!trabajo_id) return res.status(400).json({ error: 'trabajo_id es obligatorio' });
  albanesService.asignarLineas(req.params.id, trabajo_id, linea_ids);
  res.json({ message: 'Líneas asignadas correctamente' });
}));

// POST /api/albaranes/lineas/:lineaId/mover
// body: { desde_trabajo_id, hasta_trabajo_id }
router.post('/lineas/:lineaId/mover', asyncHandler(async (req, res) => {
  const { desde_trabajo_id, hasta_trabajo_id } = req.body;
  if (!desde_trabajo_id || !hasta_trabajo_id) {
    return res.status(400).json({ error: 'desde_trabajo_id y hasta_trabajo_id son obligatorios' });
  }
  albanesService.moverLinea(req.params.lineaId, desde_trabajo_id, hasta_trabajo_id);
  res.json({ message: 'Línea movida correctamente' });
}));

// POST /api/albaranes/lineas/desasignar
// body: { linea_ids, trabajo_id }
router.post('/lineas/desasignar', asyncHandler(async (req, res) => {
  const { linea_ids, trabajo_id } = req.body;
  if (!linea_ids?.length || !trabajo_id) {
    return res.status(400).json({ error: 'linea_ids y trabajo_id son obligatorios' });
  }
  albanesService.desasignarLineas(linea_ids, trabajo_id);
  res.json({ message: 'Líneas desasignadas correctamente' });
}));

export default router;