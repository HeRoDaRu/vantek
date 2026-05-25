import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getDashboard } from '../services/dashboard.service';

const router = Router();

// GET /api/dashboard?agrupacion=mes|trimestre|anio
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const agrupacion = (req.query.agrupacion as string) || 'mes';
    if (!['mes', 'trimestre', 'anio'].includes(agrupacion)) {
      return res.status(400).json({ error: 'agrupacion debe ser mes, trimestre o anio' });
    }
    const data = await getDashboard(agrupacion as 'mes' | 'trimestre' | 'anio');
    res.json(data);
  })
);

export default router;