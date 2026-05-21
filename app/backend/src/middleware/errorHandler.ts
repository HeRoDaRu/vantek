import { Request, Response, NextFunction } from 'express';

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
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[ERROR]', err.message);
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Datos inválidos', details: err });
  }
  return res.status(500).json({ error: err.message || 'Error interno del servidor' });
}

// 404
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
}
