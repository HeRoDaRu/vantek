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