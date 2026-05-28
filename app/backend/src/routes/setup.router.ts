import { Router } from 'express';
import { asyncHandler } from '@middleware/errorHandler';
import { checkSetupRequired, saveSetup } from '@services/setup.service';
import { SetupPayload, PerfilNegocio } from '../types';

const router = Router();

// ─── GET /api/setup/status ────────────────────────────────────────────────────
// El frontend lo consulta al arrancar.
// Responde { necesita_setup: true } si empresa.nombre o perfil están vacíos.

router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const necesita = checkSetupRequired();
    return res.json({ necesita_setup: necesita });
  })
);

// ─── POST /api/setup ──────────────────────────────────────────────────────────
// Recibe perfil + datos de empresa, valida y escribe los dos ficheros de config.

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { perfil, entidades_custom, empresa } = req.body as SetupPayload;

    // Validar perfil
    const perfilesValidos: PerfilNegocio[] = ['reformas', 'taller', 'otro'];
    if (!perfil || !perfilesValidos.includes(perfil)) {
      return res.status(400).json({
        error: 'El campo perfil es obligatorio y debe ser reformas, taller u otro',
      });
    }

    // Si el perfil es personalizado, validar que vengan las entidades custom
    if (perfil === 'otro') {
      const campos: (keyof NonNullable<SetupPayload['entidades_custom']>)[] = [
        'cliente', 'clientes', 'agrupador', 'agrupadores', 'trabajo', 'trabajos',
      ];
      for (const campo of campos) {
        if (!entidades_custom?.[campo]?.trim()) {
          return res.status(400).json({
            error: `El campo entidades_custom.${campo} es obligatorio para el perfil personalizado`,
          });
        }
      }
    }

    // Validar datos de empresa
    if (!empresa?.nombre?.trim()) {
      return res.status(400).json({ error: 'El nombre de empresa es obligatorio' });
    }
    if (!empresa?.cif?.trim()) {
      return res.status(400).json({ error: 'El CIF es obligatorio' });
    }

    saveSetup({ perfil, entidades_custom, empresa });

    return res.json({ ok: true });
  })
);

export default router;