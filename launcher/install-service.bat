@echo off
:: ============================================================
:: Vantek — Instalación como servicio de Windows con NSSM
:: Ejecutar como Administrador
:: ============================================================

SET SERVICE_NAME=VANTEK
SET VANTEK_DIR=%~dp0..
SET NODE_EXE=%VANTEK_DIR%\node\node.exe
SET LAUNCHER=%VANTEK_DIR%\launcher\launcher.js

echo.
echo Instalando servicio VANTEK...
echo Directorio: %VANTEK_DIR%
echo.

:: Instalar servicio apuntando al launcher
nssm install %SERVICE_NAME% "%NODE_EXE%" "%LAUNCHER%"

:: Directorio de trabajo
nssm set %SERVICE_NAME% AppDirectory "%VANTEK_DIR%"

:: Reinicio automático si el proceso falla (5 segundos de espera)
nssm set %SERVICE_NAME% AppRestartDelay 5000

:: Logs con rotación por tamaño (5MB)
nssm set %SERVICE_NAME% AppStdout "%VANTEK_DIR%\logs\service-stdout.log"
nssm set %SERVICE_NAME% AppStderr "%VANTEK_DIR%\logs\service-stderr.log"
nssm set %SERVICE_NAME% AppRotateFiles 1
nssm set %SERVICE_NAME% AppRotateBytes 5242880

:: Arranque automático con Windows
nssm set %SERVICE_NAME% Start SERVICE_AUTO_START

:: Arrancar el servicio ahora
nssm start %SERVICE_NAME%

echo.
echo Servicio VANTEK instalado y arrancado.
echo.
echo Para gestionar el servicio:
echo   nssm edit VANTEK       — abrir panel de control
echo   nssm stop VANTEK       — detener
echo   nssm restart VANTEK    — reiniciar
echo   nssm remove VANTEK     — desinstalar
echo.
pause
