// =============================================================================
// Vantek — Provisión de assets de OCR (Tesseract.js)
// =============================================================================
// Los binarios de Tesseract (worker, core WASM y modelo de idioma) NO se versionan
// en el repositorio: son una dependencia que se resuelve en la primera instalación.
//
// Este script:
//   1. Copia el worker y el core WASM desde node_modules (tesseract.js / tesseract.js-core).
//   2. Descarga el modelo de idioma español (spa.traineddata.gz) si no está presente.
//
// Se ejecuta como parte de `npm run build` del frontend, de modo que funciona igual
// en el build de Docker (Linux) y en la build local con Node portable (Windows).
// Es idempotente: si un asset ya existe con un tamaño razonable, no se vuelve a generar.
// =============================================================================

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';
import https from 'node:https';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, '..');

const publicDir = join(frontendRoot, 'public');
const workerDir = join(publicDir, 'tesseract-worker');
const tessdataDir = join(publicDir, 'tessdata');

// Modelo de idioma: tesseract.js v5 descarga `${langPath}/spa.traineddata.gz` (gzipped).
const MODELO_URL = 'https://tessdata.projectnaptha.com/4.0.0/spa.traineddata.gz';
const MODELO_MIN_BYTES = 1_000_000; // sanity check (~8 MB reales)

// Ficheros a copiar desde node_modules → public/tesseract-worker/
const ASSETS_NODE_MODULES = [
  { modulo: 'tesseract.js/dist/worker.min.js', destino: 'worker.min.js' },
  { modulo: 'tesseract.js-core/tesseract-core.wasm.js', destino: 'tesseract-core.wasm.js' },
  { modulo: 'tesseract.js-core/tesseract-core.wasm', destino: 'tesseract-core.wasm' },
];

function log(msg) {
  console.log(`[ocr-assets] ${msg}`);
}

function asegurarDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copiarDesdeNodeModules() {
  asegurarDir(workerDir);
  for (const { modulo, destino } of ASSETS_NODE_MODULES) {
    const origen = require.resolve(modulo);
    const ruta = join(workerDir, destino);
    fs.copyFileSync(origen, ruta);
    log(`copiado ${destino} (${fs.statSync(ruta).size} B)`);
  }
}

function descargar(url, destino, redirecciones = 0) {
  return new Promise((resolve, reject) => {
    if (redirecciones > 5) {
      reject(new Error('Demasiadas redirecciones al descargar el modelo OCR'));
      return;
    }
    https
      .get(url, (res) => {
        // Seguir redirecciones (3xx)
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          resolve(descargar(res.headers.location, destino, redirecciones + 1));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} al descargar ${url}`));
          return;
        }
        const tmp = `${destino}.download`;
        const out = fs.createWriteStream(tmp);
        res.pipe(out);
        out.on('finish', () => {
          out.close(() => {
            fs.renameSync(tmp, destino);
            resolve();
          });
        });
        out.on('error', (err) => {
          fs.rmSync(tmp, { force: true });
          reject(err);
        });
      })
      .on('error', reject);
  });
}

async function descargarModelo() {
  asegurarDir(tessdataDir);
  const ruta = join(tessdataDir, 'spa.traineddata.gz');
  if (fs.existsSync(ruta) && fs.statSync(ruta).size >= MODELO_MIN_BYTES) {
    log('modelo spa.traineddata.gz ya presente, se omite la descarga');
    return;
  }
  log(`descargando modelo de idioma desde ${MODELO_URL} ...`);
  await descargar(MODELO_URL, ruta);
  const size = fs.statSync(ruta).size;
  if (size < MODELO_MIN_BYTES) {
    fs.rmSync(ruta, { force: true });
    throw new Error(`El modelo descargado es demasiado pequeño (${size} B)`);
  }
  log(`modelo descargado (${size} B)`);
}

async function main() {
  log('provisionando assets de OCR...');
  copiarDesdeNodeModules();
  await descargarModelo();
  log('assets de OCR listos.');
}

main().catch((err) => {
  console.error(`[ocr-assets] ERROR: ${err.message}`);
  process.exit(1);
});
