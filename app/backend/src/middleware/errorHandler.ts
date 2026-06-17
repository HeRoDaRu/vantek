/**
 * ──────────────────────────────────────────────────────────────────────────────
 * errorHandler.ts — Wrapper async y manejadores globales de error/404
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Express error infrastructure. asyncHandler wraps async controllers to
 *   avoid repeating try/catch; errorHandler catches any error, logs the 5xx
 *   and responds JSON; notFoundHandler returns a uniform 404.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · express (Request, Response, NextFunction) → middleware types
 *     · @services/errores.service (registrarError) → persists the 5xx errors
 *   Used by:
 *     · index.ts → registers errorHandler/notFoundHandler in the app
 *     · routers/* → wrap their controllers with asyncHandler
 *
 * EXPORTS
 *   · asyncHandler(fn) → middleware that forwards rejections to next()
 *   · errorHandler(err, req, res, next) → error response (400 Zod / 500)
 *   · notFoundHandler(req, res) → 404 response with the requested route
 *
 * INPUTS / OUTPUTS
 *   Input:  errors thrown/rejected in the controllers; HTTP request
 *   Output: JSON error response; side effect = logging of the 5xx error
 *
 * NOTES
 *   · 4xx validations (ZodError) are not logged: they are not server failures.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { Request, Response, NextFunction } from 'express';
import { registrarError } from '@services/errores.service';

// Wrapper async — evita try/catch en cada controlador
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Error handler global
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[ERROR]', err.message);
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Datos inválidos', details: err });
  }
  // Solo registramos errores de servidor (5xx); las validaciones 4xx no son fallos.
  registrarError({
    mensaje: err.message || 'Error interno del servidor',
    stack: err.stack ?? null,
    ruta: req.originalUrl,
    metodo: req.method,
    status: 500,
  });
  return res.status(500).json({ error: err.message || 'Error interno del servidor' });
}

// 404
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
}
