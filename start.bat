REM ──────────────────────────────────────────────────────────────────────────────
REM start.bat — Foreground manual start of Vantek CRM (no Windows service)
REM ──────────────────────────────────────────────────────────────────────────────
REM
REM WHAT IT DOES
REM   Starts Vantek in the foreground with the portable Node runtime, running
REM   launcher\launcher.js (which serves the frontend, exposes the API and manages
REM   updates). Creates the required data/logs/config folders if missing. Same
REM   runtime as the service but without NSSM supervision or auto-restart.
REM
REM RELATIONSHIPS
REM   Used by / Calls:
REM     · User (manual double-click / console) → run Vantek without the service
REM     · node\node.exe + launcher\launcher.js → the launched process
REM
REM INPUTS / OUTPUTS
REM   Input:  node\node.exe, launcher\launcher.js (must exist); NODE_ENV/VANTEK_ROOT
REM   Output: created data\, data\pdfs\, logs\, config\ dirs; running foreground server
REM
REM NOTES
REM   · Windows-only. First-run configuration is done via the app's setup wizard,
REM     not this script. Ctrl+C stops the server.
REM ──────────────────────────────────────────────────────────────────────────────

@echo off
:: ============================================================
:: Vantek CRM — Arranque manual (sin servicio de Windows)
:: Ejecuta el launcher, que sirve el frontend, expone la API
:: y gestiona las actualizaciones. Mismo runtime que el servicio,
:: pero en primer plano y sin reinicio automatico de NSSM.
:: La configuracion (config\app.config.json) se crea desde el
:: asistente de la propia aplicacion en el primer arranque.
:: ============================================================
setlocal
cd /d "%~dp0"

echo =============================================
echo        VANTEK CRM - Iniciando...
echo =============================================

:: Carpetas necesarias
if not exist "data"      mkdir "data"
if not exist "data\pdfs" mkdir "data\pdfs"
if not exist "logs"      mkdir "logs"
if not exist "config"    mkdir "config"

:: Comprobar runtime portable
if not exist "node\node.exe" (
    echo ERROR: No se encontro node\node.exe
    echo Ejecuta primero install.ps1 para descargar el runtime de Node.
    pause
    exit /b 1
)
if not exist "launcher\launcher.js" (
    echo ERROR: No se encontro launcher\launcher.js
    echo El paquete de Vantek esta incompleto. Reinstala desde el ultimo release.
    pause
    exit /b 1
)

set NODE_ENV=production
set VANTEK_ROOT=%~dp0

echo Iniciando Vantek CRM ^(Ctrl+C para detener^)...
node\node.exe launcher\launcher.js

echo.
echo Vantek se ha detenido.
pause
endlocal