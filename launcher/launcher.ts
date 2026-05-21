/**
 * Vantek Launcher
 *
 * Responsabilidades:
 * 1. Comprobar si hay nueva versión en GitHub Releases
 * 2. Descargar y aplicar si hay nueva versión (verificando borrador limpio)
 * 3. Arrancar el servidor
 * 4. En caso de error: notificar por email y arrancar versión actual
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'app.config.json');
const VERSION_PATH = path.join(ROOT, 'version.json');
const LOG_PATH = path.join(ROOT, 'logs', 'launcher.log');
const TMP_ZIP = path.join(ROOT, 'logs', 'update.zip');

const GITHUB_OWNER = 'herodaru';
const GITHUB_REPO = 'vantek';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_PATH, line + '\n');
  } catch { /* si falla el log, continúa */ }
}

// ─── Configuración ────────────────────────────────────────────────────────────

function getConfig(): any {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function getCurrentVersion(): string {
  try {
    return JSON.parse(fs.readFileSync(VERSION_PATH, 'utf-8')).version;
  } catch {
    return '0.0.0';
  }
}

// ─── Email de error ───────────────────────────────────────────────────────────

async function sendErrorEmail(subject: string, body: string): Promise<void> {
  const config = getConfig();
  if (!config?.sistema?.email_errores) return;
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({ sendmail: true });
    await transporter.sendMail({
      from: 'Vantek@localhost',
      to: config.sistema.email_errores,
      subject: `[Vantek] ${subject}`,
      text: body
    });
    log(`Email de error enviado a ${config.sistema.email_errores}`);
  } catch (err) {
    log(`Error al enviar email de notificación: ${err}`);
  }
}

// ─── GitHub Release ───────────────────────────────────────────────────────────

function fetchLatestRelease(): Promise<any> {
  return new Promise((resolve) => {
    const req = https.get(GITHUB_API, { headers: { 'User-Agent': 'Vantek-Launcher' } }, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
  });
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Vantek-Launcher' } }, (res: any) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err: any) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// ─── Verificar borrador sucio ─────────────────────────────────────────────────

async function hasDirtyDraft(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.get('http://localhost:3000/api/status/draft',
      { headers: { 'User-Agent': 'Vantek-Launcher' } },
      (res: any) => {
        let data = '';
        res.on('data', (c: any) => data += c);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.dirty === true);
          } catch { resolve(false); }
        });
      }
    );
    req.on('error', () => resolve(false)); // si no hay servidor, no hay borrador sucio
    req.setTimeout(3000, () => { req.destroy(); resolve(false); });
  });
}

// ─── Actualización ────────────────────────────────────────────────────────────

async function checkAndUpdate(): Promise<void> {
  log('Comprobando actualizaciones en GitHub...');

  const release = await fetchLatestRelease();
  if (!release) {
    log('No se pudo conectar con GitHub. Se arrancará con la versión actual.');
    await sendErrorEmail(
      'Error de actualización',
      'No se pudo conectar con GitHub para comprobar actualizaciones. Se arrancó con la versión actual.'
    );
    return;
  }

  const latestVersion = (release.tag_name || '').replace('v', '');
  const currentVersion = getCurrentVersion();

  if (!latestVersion || latestVersion === currentVersion) {
    log(`Versión actual (${currentVersion}) es la última. Sin actualizaciones.`);
    return;
  }

  log(`Nueva versión disponible: v${latestVersion} (actual: v${currentVersion})`);

  const asset = (release.assets || []).find((a: any) => a.name === 'Vantek-release.zip');
  if (!asset) {
    log('No se encontró el asset Vantek-release.zip en la release. Arrancando versión actual.');
    return;
  }

  // Verificar borrador sucio antes de aplicar
  const dirty = await hasDirtyDraft();
  if (dirty) {
    log('Hay un borrador sin guardar. La actualización se pospondrá al siguiente arranque.');
    return;
  }

  try {
    log('Descargando actualización...');
    await downloadFile(asset.browser_download_url, TMP_ZIP);
    log('Descarga completada. Extrayendo...');

    // Extraer con adm-zip (debe estar disponible en node_modules)
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(TMP_ZIP);
    zip.extractAllTo(ROOT, true);

    // Actualizar version.json
    fs.writeFileSync(VERSION_PATH, JSON.stringify({ version: latestVersion }, null, 2));

    // Limpiar ZIP temporal
    if (fs.existsSync(TMP_ZIP)) fs.unlinkSync(TMP_ZIP);

    log(`Actualización a v${latestVersion} aplicada correctamente.`);
  } catch (err) {
    log(`Error al aplicar la actualización: ${err}`);
    await sendErrorEmail(
      'Error al aplicar actualización',
      `No se pudo aplicar la actualización a v${latestVersion}.\n\nError: ${err}\n\nSe arrancó con la versión actual.`
    );
    // Nunca sobrescribir la versión actual si la descarga falló parcialmente
    if (fs.existsSync(TMP_ZIP)) {
      try { fs.unlinkSync(TMP_ZIP); } catch { /* ignorar */ }
    }
  }
}

// ─── Arrancar servidor ────────────────────────────────────────────────────────

function startServer(): void {
  const serverPath = path.join(ROOT, 'app', 'backend', 'dist', 'index.js');

  if (!fs.existsSync(serverPath)) {
    log('ERROR CRÍTICO: No se encontró el servidor compilado en app/backend/dist/index.js');
    log('Verifica que el proyecto está compilado correctamente.');
    process.exit(1);
  }

  log('Arrancando servidor Vantek...');

  const server = spawn(process.execPath, [serverPath], {
    env: { ...process.env, NODE_ENV: 'production' },
    cwd: ROOT,
    stdio: 'inherit'
  });

  server.on('error', (err: Error) => {
    log(`Error del proceso servidor: ${err.message}`);
  });

  server.on('exit', (code: number) => {
    log(`El servidor terminó con código ${code}`);
    if (code !== 0) {
      log('El servidor terminó inesperadamente. NSSM lo reiniciará automáticamente.');
    }
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Asegurar directorio de logs
  const logsDir = path.join(ROOT, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  log('=== Vantek Launcher iniciado ===');
  log(`Versión actual: ${getCurrentVersion()}`);

  await checkAndUpdate();
  startServer();
}

main().catch(err => {
  console.error('Error fatal en el launcher:', err);
  process.exit(1);
});
