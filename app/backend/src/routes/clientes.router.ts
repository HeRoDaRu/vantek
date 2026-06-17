/**
 * ──────────────────────────────────────────────────────────────────────────────
 * clientes.router.ts — Clientes / agrupadores / trabajos REST router
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Express router mounted at /api/clientes. Serves the nested hierarchy
 *   cliente → agrupador → trabajo, delegating to clientesService,
 *   agrupadoresService and trabajosService. Clientes/agrupadores use logical
 *   delete (activo = 0).
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @middleware/errorHandler (asyncHandler) → wrap async routes
 *     · @services/clientes.service, agrupadores.service, trabajos.service
 *   Used by:
 *     · index.ts → app.use('/api/clientes', router)
 *
 * ENDPOINTS
 *   · GET    /                            → list (optional ?search)
 *   · GET    /search?q=                   → global search (min 2 chars)
 *   · GET    /:id                         → full ficha with nested agrupadores/trabajos
 *   · POST   /                            → create cliente (nombre required)
 *   · PUT    /:id                         → update cliente
 *   · DELETE /:id                         → logical delete cliente
 *   · GET    /:clienteId/agrupadores      → agrupadores of a cliente
 *   · POST   /:clienteId/agrupadores      → create agrupador (label required)
 *   · PUT    /:clienteId/agrupadores/:id  → update agrupador
 *   · DELETE /:clienteId/agrupadores/:id  → logical delete agrupador
 *   · GET    /:clienteId/agrupadores/:agrupadorId/trabajos       → trabajos of agrupador
 *   · POST   /:clienteId/agrupadores/:agrupadorId/trabajos       → create trabajo
 *   · PUT    /:clienteId/agrupadores/:agrupadorId/trabajos/:id   → update trabajo
 *   · GET    /:clienteId/agrupadores/:agrupadorId/trabajos/:id/albaranes → trabajo albaranes
 *
 * INPUTS / OUTPUTS
 *   Input:  HTTP req params/query/body
 *   Output: JSON { data } / { message } / { error }
 *
 * NOTES
 *   · default export = the configured Router.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import { clientesService } from '@services/clientes.service';
import { agrupadoresService } from '@services/agrupadores.service';
import { trabajosService } from '@services/trabajos.service';

const router = Router();

// GET /api/clientes?search=
router.get('/', asyncHandler(async (req, res) => {
  const search = req.query.search as string | undefined;
  const clientes = clientesService.findAll(search);
  res.json({ data: clientes });
}));

// GET /api/clientes/search?q=  — búsqueda global
router.get('/search', asyncHandler(async (req, res) => {
  const q = req.query.q as string;
  if (!q || q.length < 2) return res.json({ data: [] });
  const results = clientesService.search(q);
  res.json({ data: results });
}));

// GET /api/clientes/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const cliente = clientesService.findById(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json({ data: cliente });
}));

// POST /api/clientes
router.post('/', asyncHandler(async (req, res) => {
  const { nombre, empresa, dni_cif, telefono, email, notas } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const cliente = clientesService.create({ nombre, empresa, dni_cif, telefono, email, notas });
  res.status(201).json({ data: cliente });
}));

// PUT /api/clientes/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const cliente = clientesService.update(req.params.id, req.body);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json({ data: cliente });
}));

// DELETE /api/clientes/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  clientesService.delete(req.params.id);
  res.json({ message: 'Cliente eliminado' });
}));

// ─── Agrupadores ─────────────────────────────────────────────────────────────

// GET /api/clientes/:clienteId/agrupadores
router.get('/:clienteId/agrupadores', asyncHandler(async (req, res) => {
  const agrupadores = agrupadoresService.findByCliente(req.params.clienteId);
  res.json({ data: agrupadores });
}));

// POST /api/clientes/:clienteId/agrupadores
router.post('/:clienteId/agrupadores', asyncHandler(async (req, res) => {
  const { label, descripcion } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: 'El label es obligatorio' });
  const agrupador = agrupadoresService.create({
    cliente_id: req.params.clienteId,
    label,
    descripcion
  });
  res.status(201).json({ data: agrupador });
}));

// PUT /api/clientes/:clienteId/agrupadores/:id
router.put('/:clienteId/agrupadores/:id', asyncHandler(async (req, res) => {
  const agrupador = agrupadoresService.update(req.params.id, req.body);
  if (!agrupador) return res.status(404).json({ error: 'Agrupador no encontrado' });
  res.json({ data: agrupador });
}));

// DELETE /api/clientes/:clienteId/agrupadores/:id
router.delete('/:clienteId/agrupadores/:id', asyncHandler(async (req, res) => {
  agrupadoresService.delete(req.params.id);
  res.json({ message: 'Agrupador eliminado' });
}));

// ─── Trabajos ─────────────────────────────────────────────────────────────────

// GET /api/clientes/:clienteId/agrupadores/:agrupadorId/trabajos
router.get('/:clienteId/agrupadores/:agrupadorId/trabajos', asyncHandler(async (req, res) => {
  const trabajos = trabajosService.findByAgrupador(req.params.agrupadorId);
  res.json({ data: trabajos });
}));

// POST /api/clientes/:clienteId/agrupadores/:agrupadorId/trabajos
router.post('/:clienteId/agrupadores/:agrupadorId/trabajos', asyncHandler(async (req, res) => {
  const { nombre, descripcion, margen_porcentaje } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const trabajo = trabajosService.create({
    agrupador_id: req.params.agrupadorId,
    nombre,
    descripcion,
    margen_porcentaje: margen_porcentaje ? Number(margen_porcentaje) : undefined
  });
  res.status(201).json({ data: trabajo });
}));

// PUT /api/clientes/:clienteId/agrupadores/:agrupadorId/trabajos/:id
router.put('/:clienteId/agrupadores/:agrupadorId/trabajos/:id', asyncHandler(async (req, res) => {
  const trabajo = trabajosService.update(req.params.id, req.body);
  if (!trabajo) return res.status(404).json({ error: 'Trabajo no encontrado' });
  res.json({ data: trabajo });
}));

// GET /api/clientes/:clienteId/agrupadores/:agrupadorId/trabajos/:id/albaranes
router.get('/:clienteId/agrupadores/:agrupadorId/trabajos/:id/albaranes', asyncHandler(async (req, res) => {
  const albaranes = trabajosService.findAlbaranes(req.params.id);
  res.json({ data: albaranes });
}));

export default router;