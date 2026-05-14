import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { runMigrations } from './db/migrate';
import { getAppConfig, getProfileConfig } from './utils/config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import clientesRouter from './routes/clientes.router';
import albanesRouter from './routes/albaranes.router';

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

// ─── Config endpoints ─────────────────────────────────────────────────────────
app.get('/api/config/profile', (_req, res) => { res.json(getProfileConfig()); });
app.get('/api/config/app', (_req, res) => { res.json(getAppConfig()); });

// ─── Status (usado por el launcher para verificar borrador sucio) ─────────────
app.get('/api/status', (_req, res) => {
  res.json({ ok: true, version: process.env.npm_package_version || '0.1.0' });
});
// En Fase 3 se añadirá /api/status/draft para verificar borradores activos

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/clientes', clientesRouter);
app.use('/api/albaranes', albanesRouter);
// Fase 3:
// import presupuestosRouter from './routes/presupuestos.router';
// import facturasRouter from './routes/facturas.router';
// app.use('/api/presupuestos', presupuestosRouter);
// app.use('/api/facturas', facturasRouter);
// Fase 5:
// import seguimientoRouter from './routes/seguimiento.router';
// app.use('/api/seguimiento', seguimientoRouter);

// ─── SPA fallback (producción) ────────────────────────────────────────────────
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