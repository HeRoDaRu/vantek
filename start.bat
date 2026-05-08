@echo off
echo =============================================
echo        VANTEK CRM - Iniciando...
echo =============================================

cd /d "%~dp0"

:: Crear carpetas necesarias
if not exist "data\database" mkdir "data\database"
if not exist "data\documents" mkdir "data\documents\facturas"
if not exist "data\documents\presupuestos"
if not exist "logs" mkdir "logs"
if not exist "config" mkdir "config"

:: Copiar template si no existe profile.json
if not exist "config\profile.json" (
    echo Copiando profile template...
    copy "config\profile.template.json" "config\profile.json"
)

echo Iniciando Vantek CRM...

:: Lanzar backend (que sirve todo)
cd app\backend
..\..\node\node.exe dist\server.js

pause