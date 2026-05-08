import { db } from './index.js';
import path from 'path';
import fs from 'fs';

const ROOT_DIR = path.join(__dirname, '../../../');

export function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  // Ejemplo de migración v1.1.0 (puedes ir añadiendo más)
  const currentVersion = '1.0.0'; // Podríamos guardarla en la DB

  console.log('🔄 Ejecutando migraciones...');
  
  // Aquí irán las migraciones futuras (añadir columnas, tablas nuevas, etc.)
  // Ejemplo:
  // try {
  //   db.exec(`ALTER TABLE documentos ADD COLUMN campo_nuevo TEXT;`);
  // } catch (e) { /* columna ya existe */ }

  console.log('✅ Migraciones completadas');
}