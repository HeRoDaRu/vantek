@echo off
:: ============================================================
:: VANTEK — Desinstalación del servicio de Windows
:: Ejecutar como Administrador
:: ============================================================

SET SERVICE_NAME=VANTEK
SET VANTEK_DIR=%~dp0..
SET NSSM=%VANTEK_DIR%\tools\nssm.exe

echo Deteniendo y desinstalando servicio VANTEK...

if not exist "%NSSM%" (
    echo ERROR: No se encontro nssm.exe en %NSSM%
    pause
    exit /b 1
)

"%NSSM%" stop %SERVICE_NAME%
"%NSSM%" remove %SERVICE_NAME% confirm

echo.
echo Servicio VANTEK desinstalado.
pause
