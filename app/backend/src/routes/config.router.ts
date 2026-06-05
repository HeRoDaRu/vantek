import { Router, Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import { getProfileConfig, getAppConfig, reloadProfileConfig, reloadAppConfig } from '@utils/config';
import fs from 'fs';
import path from 'path';

const router = Router();

const CONFIG_DIR        = path.join(__dirname, '..', '..', 'config');
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

export default router;