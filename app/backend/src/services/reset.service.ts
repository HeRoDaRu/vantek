/**
 * ──────────────────────────────────────────────────────────────────────────────
 * reset.service.ts — Borrado total de los datos de negocio (fresh start)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Wipes all business data (clientes, agrupadores, trabajos, proveedores,
 *   albaranes, presupuestos, facturas, seguimiento y el log de errores) and
 *   the generated PDFs, leaving the database empty as if freshly installed.
 *   It does NOT touch the schema (_migraciones), the usuarios infrastructure
 *   table, nor any config file: the app keeps its configuration intact.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @db/connection (getDb) → SQLite handle
 *     · @utils/paths (PDFS_DIR) → folder of generated PDFs to clear
 *     · fs → remove the PDF files
 *   Used by:
 *     · routes/config.router.ts → POST /api/config/reset-datos
 *
 * EXPORTS
 *   · resetDatos() → deletes every business row + PDFs (returns nothing)
 *
 * INPUTS / OUTPUTS
 *   Input:  none
 *   Output: emptied data tables + cleared data/pdfs (side effects)
 *
 * NOTES
 *   · Runs inside db.transaction() for atomicity; tables are deleted
 *     child→parent so foreign keys never block.
 *   · Config files and _migraciones are intentionally preserved (fresh data,
 *     same install). The usuarios table is infrastructure and is left intact.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import { getDb } from '@db/connection';
import { PDFS_DIR } from '@utils/paths';

// Orden hijo → padre para respetar las claves foráneas.
const TABLAS_EN_ORDEN = [
  'factura_versiones',
  'factura_lineas',
  'facturas',
  'presupuesto_versiones',
  'presupuesto_lineas',
  'presupuestos',
  'albaran_linea_trabajo',
  'albaran_lineas',
  'albaranes',
  'seguimiento',
  'trabajos',
  'agrupadores',
  'clientes',
  'proveedores',
  'errores',
];

export function resetDatos(): void {
  const db = getDb();

  const borrar = db.transaction(() => {
    for (const tabla of TABLAS_EN_ORDEN) {
      db.prepare(`DELETE FROM ${tabla}`).run();
    }
  });
  borrar();

  // Borrar los PDFs generados; el directorio se conserva.
  try {
    if (fs.existsSync(PDFS_DIR)) {
      for (const nombre of fs.readdirSync(PDFS_DIR)) {
        const ruta = path.join(PDFS_DIR, nombre);
        if (fs.statSync(ruta).isFile()) {
          fs.unlinkSync(ruta);
        }
      }
    }
  } catch (err) {
    // No es crítico: la base de datos ya está limpia.
    console.error('[reset] No se pudieron borrar todos los PDFs:', err);
  }
}
