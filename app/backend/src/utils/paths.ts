import path from 'path';

/**
 * Raíz de la instalación, usada para resolver config/, data/ y el frontend.
 *
 * - Windows (Node portable): el launcher arranca el servidor con cwd = raíz de
 *   instalación y exporta VANTEK_ROOT con esa misma ruta.
 * - Docker: el contenedor arranca con WORKDIR /app y `node dist/index.js`, por lo
 *   que process.cwd() === '/app'.
 *
 * Anclar todas las rutas base a APP_ROOT (en lugar de a __dirname relativo) evita
 * que la profundidad distinta del `dist` entre ambos despliegues rompa las rutas.
 */
export const APP_ROOT = process.env.VANTEK_ROOT || process.cwd();

export const CONFIG_DIR = path.join(APP_ROOT, 'config');
export const DATA_DIR = path.join(APP_ROOT, 'data');
export const PDFS_DIR = path.join(DATA_DIR, 'pdfs');
