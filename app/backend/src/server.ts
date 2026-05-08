import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// RUTAS ABSOLUTAS (importante para portable)
// =============================================
const ROOT_DIR = path.join(__dirname, '../../..'); // Sube hasta la raíz vantek-crm/
const FRONTEND_DIST = path.join(ROOT_DIR, 'app/frontend/dist');
const CONFIG_DIR = path.join(ROOT_DIR, 'config');
const DATA_DIR = path.join(ROOT_DIR, 'data');

// =============================================
// MIDDLEWARE BÁSICO
// =============================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// =============================================
// CARGA SEGURA DEL PROFILE
// =============================================
function loadProfile() {
  const templatePath = path.join(CONFIG_DIR, 'profile.template.json');
  const userConfigPath = path.join(CONFIG_DIR, 'profile.json');

  try {
    // Si no existe el profile del cliente → crear desde template
    if (!fs.existsSync(userConfigPath) && fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, userConfigPath);
      console.log('✅ Profile creado desde template para este cliente');
    }

    const config = JSON.parse(fs.readFileSync(userConfigPath, 'utf8'));
    
    // Aquí irán las migraciones futuras (ej: añadir campos nuevos)
    // runProfileMigrations(config);

    return config;
  } catch (error) {
    console.error('❌ Error cargando profile:', error);
    return { businessName: 'Vantek CRM', profileType: 'reformas' }; // fallback seguro
  }
}

export const profile = loadProfile();

// =============================================
// SERVIR FRONTEND EN PRODUCCIÓN
// =============================================
if (process.env.NODE_ENV === 'production' || !fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
  // En producción: servir archivos estáticos del frontend
  app.use(express.static(FRONTEND_DIST));
  
  // SPA fallback (importante para React Router)
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// =============================================
// RUTAS BÁSICAS
// =============================================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '1.0.0',
    profile: profile.businessName,
    timestamp: new Date().toISOString()
  });
});

// Ruta para obtener el profile (útil para frontend)
app.get('/api/profile', (req, res) => {
  res.json(profile);
});

// =============================================
// INICIO DEL SERVIDOR
// =============================================
app.listen(PORT, () => {
  console.log(`🚀 Vantek CRM corriendo en http://localhost:${PORT}`);
  console.log(`📁 Perfil cargado: ${profile.businessName} (${profile.profileType})`);
});

// Manejo graceful shutdown (útil para servicio Windows)
process.on('SIGTERM', () => {
  console.log('🛑 Cerrando servidor...');
  process.exit(0);
});