/**
 * ──────────────────────────────────────────────────────────────────────────────
 * seguimiento.router.ts — Lead/work tracking (seguimiento) REST router
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Express router mounted at /api/seguimiento. CRUD over the shared seguimiento
 *   table (reformas leads + taller work orders) plus the state-machine endpoint,
 *   delegating to SeguimientoService.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · ../middleware/errorHandler (asyncHandler) → wrap async routes
 *     · ../services/seguimiento.service (* as SeguimientoService) → all logic
 *   Used by:
 *     · index.ts → app.use('/api/seguimiento', router)
 *
 * ENDPOINTS
 *   · GET    /          → list (optional ?estado)
 *   · GET    /:id       → detail (404 if missing)
 *   · POST   /          → create (nombre required)
 *   · PUT    /:id       → update form data
 *   · POST   /:id/estado → change state (auto-converts to cliente; may 400)
 *   · DELETE /:id       → delete the seguimiento row only (204; 400 on error)
 *
 * INPUTS / OUTPUTS
 *   Input:  HTTP req params/query/body
 *   Output: JSON seguimiento item / 204 / { error }
 *
 * NOTES
 *   · cambiarEstado / eliminar surface service errors via statusCode → HTTP code.
 *   · default export = the configured Router.
 * ──────────────────────────────────────────────────────────────────────────────
 */

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
  const { estado, motivo } = req.body;
  if (!estado) return res.status(400).json({ error: 'El campo estado es obligatorio' });
  try {
    const item = SeguimientoService.cambiarEstado(req.params.id, estado, motivo);
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