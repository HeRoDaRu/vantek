import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getProfileConfig, getAppConfig } from '../utils/config';
import fs from 'fs';
import path from 'path';

const router = Router();

const APP_CONFIG_PATH = path.resolve(process.cwd(), '../../config/app.config.json');

// GET /api/config/profile
router.get(
  '/profile',
  asyncHandler(async (_req: Request, res: Response) => {
    const profile = getProfileConfig();
    res.json(profile);
  })
);

// GET /api/config/app
router.get(
  '/app',
  asyncHandler(async (_req: Request, res: Response) => {
    const config = getAppConfig();
    res.json(config);
  })
);

// PUT /api/config/app — el frontend manda el objeto completo, se sobreescribe
router.put(
  '/app',
  asyncHandler(async (req: Request, res: Response) => {
    const nuevo = req.body;
    if (!nuevo || typeof nuevo !== 'object') {
      return res.status(400).json({ error: 'Body inválido' });
    }
    fs.writeFileSync(APP_CONFIG_PATH, JSON.stringify(nuevo, null, 2), 'utf-8');
    res.json({ ok: true });
  })
);

export default router;