import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import asyncHandler from 'express-async-handler';
import { runMigrations } from './db/migrate';
import { getAppConfig, getProfileConfig } from './utils/config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import clientesRouter from './routes/clientes.router';
import albanesRouter from './routes/albaranes.router';
import setupRouter from './routes/setup.router';
import presupuestosRouter from './routes/presupuestos.router';
import facturasRouter from './routes/facturas.router';
import { hayBorradorSucio } from './services/facturas.service';
import dashboardRouter from './routes/dashboard.router';
import configRouter from './routes/config.router';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// ─── Estáticos (producción) ───────────────────────────────────────────────────
const FRONTEND_DIST = path.resolve(process.cwd(), '../../dist/public');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(FRONTEND_DIST));
}
app.use('/pdfs', express.static(path.resolve(process.cwd(), '../../data/pdfs')));

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

// Fase 5:
// import seguimientoRouter from './routes/seguimiento.router';
// app.use('/api/seguimiento', seguimientoRouter);

// ─── SPA fallback (producción) ────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// ─── placeholders de actualización ────────────────────────────────────────────
const UPDATE_STATE_PATH = path.join(process.cwd(), 'data', 'update-state.json');
 
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


// ─── Error handlers (siempre al final) ───────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Arranque ─────────────────────────────────────────────────────────────────
function start() {
  try {
    console.log('[Vantek] Iniciando...');
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