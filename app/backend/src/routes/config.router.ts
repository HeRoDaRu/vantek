/**
 * ──────────────────────────────────────────────────────────────────────────────
 * config.router.ts — App/profile config + email test + error log router
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Express router mounted at /api/config. Reads/writes the app.config.json and
 *   profile.config.json files (whole-object PUT, no validation per design),
 *   tests SMTP connectivity, and lists/sends/clears the recorded error log.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @utils/config → get/reload app & profile config (cache invalidation)
 *     · @services/email.service (verificarSmtp, enviarErrores) → SMTP test + report
 *     · @services/errores.service → list/count/delete recorded errors
 *     · @utils/paths (CONFIG_DIR) → locate the JSON config files
 *   Used by:
 *     · index.ts → app.use('/api/config', router)
 *
 * ENDPOINTS
 *   · GET  /profile        → profile config JSON
 *   · GET  /app            → app config JSON
 *   · PUT  /app            → overwrite app.config.json (full object) + reload
 *   · PUT  /profile        → overwrite profile.config.json (full object) + reload
 *   · POST /email/test     → verify SMTP credentials (optional body.smtp)
 *   · GET  /errores        → list + count recorded errors (?desde&hasta)
 *   · POST /errores/enviar → email errors to the technician, then delete them
 *   · POST /reset-datos    → wipe all business data + PDFs (keeps config)
 *
 * INPUTS / OUTPUTS
 *   Input:  HTTP req body/query
 *   Output: JSON config objects / { ok } / { error }
 *
 * NOTES
 *   · PUT writes the file verbatim without validation; the frontend must always
 *     send a complete, coherent object.
 *   · Errors are only deleted after a successful send.
 *   · default export = the configured Router.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import { getProfileConfig, getAppConfig, reloadProfileConfig, reloadAppConfig } from '@utils/config';
import { verificarSmtp, enviarErrores } from '@services/email.service';
import { listarErrores, contarErrores, borrarErrores } from '@services/errores.service';
import { resetDatos } from '@services/reset.service';
import { CONFIG_DIR } from '@utils/paths';
import fs from 'fs';
import path from 'path';

const router = Router();

const APP_CONFIG_PATH   = path.join(CONFIG_DIR, 'app.config.json');
const PROFILE_CONFIG_PATH = path.join(CONFIG_DIR, 'profile.config.json');

// GET /api/config/profile
router.get('/profile', asyncHandler(async (_req: Request, res: Response) => {
  res.json(getProfileConfig());
}));

// GET /api/config/app
router.get('/app', asyncHandler(async (_req: Request, res: Response) => {
  res.json(getAppConfig());
}));

// PUT /api/config/app
router.put('/app', asyncHandler(async (req: Request, res: Response) => {
  const nuevo = req.body;
  if (!nuevo || typeof nuevo !== 'object') {
    return res.status(400).json({ error: 'Body inválido' });
  }
  fs.writeFileSync(APP_CONFIG_PATH, JSON.stringify(nuevo, null, 2), 'utf-8');
  reloadAppConfig();
  res.json({ ok: true });
}));

// PUT /api/config/profile
router.put('/profile', asyncHandler(async (req: Request, res: Response) => {
  const nuevo = req.body;
  if (!nuevo || typeof nuevo !== 'object') {
    return res.status(400).json({ error: 'Body inválido' });
  }
  fs.writeFileSync(PROFILE_CONFIG_PATH, JSON.stringify(nuevo, null, 2), 'utf-8');
  reloadProfileConfig();
  res.json({ ok: true });
}));

// POST /api/config/email/test — verifica conexión y credenciales SMTP
router.post('/email/test', asyncHandler(async (req: Request, res: Response) => {
  try {
    const smtp = req.body?.smtp && typeof req.body.smtp === 'object' ? req.body.smtp : undefined;
    await verificarSmtp(smtp);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Error de conexión SMTP',
    });
  }
}));

// GET /api/config/errores?desde=&hasta= — listado/recuento de errores registrados
router.get('/errores', asyncHandler(async (req: Request, res: Response) => {
  const { desde, hasta } = req.query as Record<string, string>;
  const total = contarErrores(desde, hasta);
  const errores = listarErrores(desde, hasta);
  res.json({ total, errores });
}));

// POST /api/config/errores/enviar — envía los errores del rango al técnico y los borra
router.post('/errores/enviar', asyncHandler(async (req: Request, res: Response) => {
  const { desde, hasta } = req.body ?? {};
  const config = getAppConfig();
  const destino = config.sistema?.email_errores?.trim();

  if (!destino) {
    return res.status(400).json({ error: 'No hay email de notificaciones configurado en Sistema.' });
  }

  const errores = listarErrores(desde, hasta);
  if (errores.length === 0) {
    return res.status(400).json({ error: 'No hay errores en el rango seleccionado.' });
  }

  try {
    await enviarErrores(errores, destino, { desde, hasta });
  } catch (err) {
    return res.status(400).json({
      error: err instanceof Error ? err.message : 'No se pudo enviar el informe de errores.',
    });
  }

  // Solo se borran tras un envío correcto.
  const borrados = borrarErrores(desde, hasta);
  res.json({ ok: true, enviados: errores.length, borrados });
}));

// POST /api/config/reset-datos — borra todos los datos de negocio (mantiene la config)
router.post('/reset-datos', asyncHandler(async (req: Request, res: Response) => {
  if (req.body?.confirmar !== 'BORRAR') {
    return res.status(400).json({ error: 'Confirmación inválida.' });
  }
  resetDatos();
  res.json({ ok: true });
}));

export default router;