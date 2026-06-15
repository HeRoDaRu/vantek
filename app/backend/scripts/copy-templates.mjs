// Copia las plantillas HTML/CSS de generación de PDF a la carpeta de salida.
//
// `tsc` solo compila los .ts; las plantillas (.html/.css) viven en src/templates
// y deben copiarse a dist/templates para el despliegue de producción. En
// desarrollo (tsx) no se usa este script: pdf.service.ts resuelve las plantillas
// relativas a su propio fichero, que en dev apunta directamente a src/templates.
//
// Multiplataforma (Windows portable + Docker), solo usa APIs nativas de Node.

import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(scriptDir, '..', 'src', 'templates');
const dest = path.join(scriptDir, '..', 'dist', 'templates');

if (!existsSync(src)) {
  console.warn('[copy-templates] No existe src/templates; nada que copiar.');
  process.exit(0);
}

await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });
console.log('[copy-templates] Plantillas copiadas a dist/templates');
