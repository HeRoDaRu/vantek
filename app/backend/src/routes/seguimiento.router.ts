import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as SeguimientoService from '../services/seguimiento.service';

const router = Router();

// GET /api/seguimiento?estado=nuevo
router.get('/', asyncHandler(async (req, res) => {
  const { estado } = req.query;
  const items = SeguimientoService.listar(
    estado ? { estado: estado as SeguimientoService.EstadoSeguimiento } : undefined,
  );
  res.json(items);
}));

// GET /api/seguimiento/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const item = SeguimientoService.obtener(req.params.id);
  if (!item) return res.status(404).json({ error: 'Seguimiento no encontrado' });
  res.json(item);
}));

// POST /api/seguimiento
router.post('/', asyncHandler(async (req, res) => {
  if (!req.body.nombre) {
    return res.status(400).json({ error: 'El campo nombre es obligatorio' });
  }
  const item = SeguimientoService.crear(req.body);
  res.status(201).json(item);
}));

// PUT /api/seguimiento/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const item = SeguimientoService.actualizar(req.params.id, req.body);
  res.json(item);
}));

// POST /api/seguimiento/:id/estado
router.post('/:id/estado', asyncHandler(async (req, res) => {
  const { estado } = req.body;
  if (!estado) return res.status(400).json({ error: 'El campo estado es obligatorio' });
  try {
    const item = SeguimientoService.cambiarEstado(req.params.id, estado);
    res.json(item);
  } catch (err: any) {
    const status = err.statusCode ?? 500;
    res.status(status).json({ error: err.message });
  }
}));

// DELETE /api/seguimiento/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  try {
    SeguimientoService.eliminar(req.params.id);
    res.status(204).end();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}));

export default router;