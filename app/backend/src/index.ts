/**
 * ──────────────────────────────────────────────────────────────────────────────
 * index.ts — Express server entry point & API bootstrap
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Builds the Express app: global middleware (helmet, cors, compression, JSON,
 *   request logger), serves static frontend/PDFs, mounts every /api router, and
 *   exposes status + update endpoints. On start() it runs config + DB migrations
 *   and listens on PORT (default 3000).
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @db/migrate (runMigrations) → bring the SQLite schema up to date on boot
 *     · @utils/config (migrateConfig) → merge new keys into app.config.json
 *     · @middleware/errorHandler → notFound + central error handlers
 *     · @routes/* → clientes, albaranes, setup, presupuestos, facturas,
 *       dashboard, config, seguimiento routers
 *     · @services/facturas.service (hayBorradorSucio) → /api/status/draft
 *     · @utils/paths (APP_ROOT, PDFS_DIR) → resolve static/PDF/update paths
 *   Used by:
 *     · launcher / Docker entrypoint → started as the backend process
 *
 * ENDPOINTS        (mounts + locally defined routes)
 *   · use /api/config, /api/setup, /api/clientes, /api/albaranes,
 *     /api/presupuestos, /api/facturas, /api/dashboard, /api/seguimiento
 *   · GET  /api/status → { ok, version }
 *   · GET  /api/status/draft → { sucio } (launcher checks for dirty draft)
 *   · GET  /api/status/update → update state read from data/update-state.json
 *   · POST /api/status/update/apply → flags launcher to apply an update
 *   · GET  * (production) → SPA fallback to frontend index.html
 *
 * INPUTS / OUTPUTS
 *   Input:  HTTP requests; env (PORT, NODE_ENV, VANTEK_ROOT)
 *   Output: running HTTP server; default export = the Express app
 *
 * NOTES
 *   · SPA fallback and express.static only active when NODE_ENV=production; in
 *     Docker nginx serves the frontend so those never fire behind the proxy.
 *   · /api/status/update[/apply] are placeholders backed by update-state.json,
 *     functional only with the Windows launcher (no-op under Docker).
 * ──────────────────────────────────────────────────────────────────────────────
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import asyncHandler from 'express-async-handler';
import { runMigrations } from '@db/migrate';
import { migrateConfig } from '@utils/config';
import { errorHandler, notFoundHandler } from '@middleware/errorHandler';
import clientesRouter from '@routes/clientes.router';
import albanesRouter from '@routes/albaranes.router';
import setupRouter from '@routes/setup.router';
import presupuestosRouter from '@routes/presupuestos.router';
import facturasRouter from '@routes/facturas.router';
import { hayBorradorSucio } from '@services/facturas.service';
import dashboardRouter from '@routes/dashboard.router';
import configRouter from '@routes/config.router';
import seguimientoRouter from './routes/seguimiento.router';
import { APP_ROOT, PDFS_DIR } from '@utils/paths';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── HTTP request logger ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const color = res.statusCode >= 500 ? '\x1b[31m'  // rojo
                : res.statusCode >= 400 ? '\x1b[33m'  // amarillo
                : res.statusCode >= 300 ? '\x1b[36m'  // cyan
                : '\x1b[32m';                          // verde
    console.log(`${color}${res.statusCode}\x1b[0m ${req.method} ${req.path} \x1b[90m${ms}ms\x1b[0m`);
  });
  next();
});

// ─── Estáticos (producción) ───────────────────────────────────────────────────
// En Windows/Node portable, Express sirve el frontend compilado por Vite
// (app/frontend/dist). En Docker el frontend lo sirve nginx, por lo que esta
// ruta no se usa (las rutas no-/api nunca llegan a Express tras el proxy).
const FRONTEND_DIST = path.join(APP_ROOT, 'app', 'frontend', 'dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(FRONTEND_DIST));
}
app.use('/pdfs', express.static(PDFS_DIR));

// ─── Config endpoints ─────────────────────────────────────────────────────────
app.use('/api/config', configRouter);

// ─── Status (usado por el launcher para verificar borrador sucio) ─────────────
app.get('/api/status', (_req, res) => {
  res.json({ ok: true, version: process.env.npm_package_version || '0.1.0' });
});

app.get('/api/status/draft', asyncHandler(async (_req, res) => {
  const sucio = await hayBorradorSucio();
  res.json({ sucio });
}));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/setup', setupRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/albaranes', albanesRouter);
app.use('/api/presupuestos', presupuestosRouter);
app.use('/api/facturas', facturasRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/seguimiento', seguimientoRouter);

// ─── placeholders de actualización ────────────────────────────────────────────
const UPDATE_STATE_PATH = path.join(APP_ROOT, 'data', 'update-state.json');
 
function readUpdateState(): any {
  try {
    return JSON.parse(fs.readFileSync(UPDATE_STATE_PATH, 'utf-8'));
  } catch {
    return { phase: 'idle', version_disponible: null, version_actual: null, error: null };
  }
}
 
function writeUpdateState(partial: object): void {
  const current = readUpdateState();
  fs.writeFileSync(UPDATE_STATE_PATH, JSON.stringify({ ...current, ...partial }, null, 2));
}
 
// GET /api/status/update
// Devuelve el estado actual de actualización para el panel de ConfigPage.
app.get('/api/status/update', (_req, res) => {
  const s = readUpdateState();
  res.json({
    phase: s.phase ?? 'idle',
    hay_update: !!s.version_disponible,
    version_disponible: s.version_disponible ?? null,
    version_actual: s.version_actual ?? null,
    ultimo_check: s.ultimo_check ?? null,
    error: s.error ?? null,
  });
});
 
// POST /api/status/update/apply
// El frontend pide al launcher que descargue y/o aplique la actualización.
// El launcher monitoriza update-state.json con fs.watchFile y reacciona al flag.
app.post('/api/status/update/apply', (req, res) => {
  const reiniciar_ahora = req.body?.reiniciar_ahora === true;
  writeUpdateState({ apply_requested: true, reiniciar_ahora });
  res.json({ ok: true, reiniciar_ahora });
});

// ─── SPA fallback (producción) ────────────────────────────────────────────────
// Debe ir tras TODAS las rutas /api para no interceptarlas. En Windows/Node
// portable sirve el index.html del frontend compilado; en Docker nunca se
// alcanza porque nginx atiende las rutas no-/api.
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// ─── Error handlers (siempre al final) ───────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Arranque ─────────────────────────────────────────────────────────────────
function start() {
  try {
    console.log('[Vantek] Iniciando...');
    migrateConfig();           // ← añadir esta línea
    runMigrations();
    console.log('[Vantek] Base de datos lista.');
    app.listen(PORT, () => {
      console.log(`[Vantek] Servidor en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Vantek] Error al iniciar:', err);
    process.exit(1);
  }
}

start();
export default app;