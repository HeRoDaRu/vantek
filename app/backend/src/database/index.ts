import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const ROOT_DIR = path.join(__dirname, '../../../');
const DB_DIR = path.join(ROOT_DIR, 'data/database');
const DB_PATH = path.join(DB_DIR, 'import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const ROOT_DIR = path.join(__dirname, '../../../');
const DB_DIR = path.join(ROOT_DIR, 'data/database');
const DB_PATH = path.join(DB_DIR, 'vantek.sqlite');

export class AppDatabase {
  private static instance: Database.Database;

  static getInstance(): Database.Database {
    if (!this.instance) {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      this.instance = new Database(DB_PATH, { verbose: console.log });

      this.instance.pragma('journal_mode = WAL');
      this.instance.pragma('foreign_keys = ON');
      this.instance.pragma('busy_timeout = 5000');

      console.log('✅ Base de datos SQLite conectada:', DB_PATH);
    }
    return this.instance;
  }

  /** Ejecuta el esquema inicial y migraciones básicas */
  static initSchema() {
    const db = this.getInstance();
    const schemaPath = path.join(__dirname, 'schema.sql');

    try {
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
        console.log('✅ Esquema de base de datos inicializado correctamente');
      } else {
        console.warn('⚠️ schema.sql no encontrado. Creando tablas mínimas...');
        this.createMinimalTables(db);
      }
    } catch (error) {
      console.error('❌ Error al inicializar esquema:', error);
    }
  }

  /** Tablas mínimas por si falla la carga del schema.sql (seguridad) */
  private static createMinimalTables(db: Database.Database) {
    //.sqlite');

export class AppDatabase {
  private static instance: Database.Database;

  static getInstance(): Database.Database {
    if (!this.instance) {
      // Crear directorio si no existe
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      this.instance = new Database(DB_PATH, { verbose: console.log });

      // Configuraciones recomendadas para mejor rendimiento y seguridad
      this.instance.pragma('journal_mode = WAL');        // Mejor concurrencia
      this.instance.pragma('foreign_keys = ON');        // Integridad referencial
      this.instance.pragma('busy_timeout = 5000');      // Evitar locks largos

      console.log('✅ Base de datos SQLite conectada:', DB_PATH);
    }
    return this.instance;
  }

  static close() {
    if (this.instance) {
      this.instance.close();
      console.log('🛑 Base de datos cerrada correctamente');
    }
  }
}

// Inicializar DB al importar
export const db = AppDatabase.getInstance();