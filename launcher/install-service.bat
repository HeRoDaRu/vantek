@echo off
:: ============================================================
:: Vantek — Instalación como servicio de Windows con NSSM
:: Ejecutar como Administrador
:: ============================================================

SET SERVICE_NAME=VANTEK
SET VANTEK_DIR=%~dp0..
SET NODE_EXE=%VANTEK_DIR%\node\node.exe
SET LAUNCHER=%VANTEK_DIR%\launcher\launcher.js
SET NSSM=%VANTEK_DIR%\tools\nssm.exe

echo.
echo Instalando servicio VANTEK...
echo Directorio: %VANTEK_DIR%
echo.

if not exist "%NSSM%" (
    echo ERROR: No se encontro nssm.exe en %NSSM%
    echo Ejecuta primero el script de instalacion ^(install.ps1^) que descarga el runtime.
    pause
    exit /b 1
)

if not exist "%NODE_EXE%" (
    echo ERROR: No se encontro node.exe en %NODE_EXE%
    echo Ejecuta primero el script de instalacion ^(install.ps1^) que descarga el runtime.
    pause
    exit /b 1
)

:: Instalar servicio apuntando al launcher
"%NSSM%" install %SERVICE_NAME% "%NODE_EXE%" "%LAUNCHER%"

:: Directorio de trabajo
"%NSSM%" set %SERVICE_NAME% AppDirectory "%VANTEK_DIR%"

:: Reinicio automático si el proceso falla (5 segundos de espera)
"%NSSM%" set %SERVICE_NAME% AppRestartDelay 5000

:: Logs con rotación por tamaño (5MB)
"%NSSM%" set %SERVICE_NAME% AppStdout "%VANTEK_DIR%\logs\service-stdout.log"
"%NSSM%" set %SERVICE_NAME% AppStderr "%VANTEK_DIR%\logs\service-stderr.log"
"%NSSM%" set %SERVICE_NAME% AppRotateFiles 1
"%NSSM%" set %SERVICE_NAME% AppRotateBytes 5242880

:: Arranque automático con Windows
"%NSSM%" set %SERVICE_NAME% Start SERVICE_AUTO_START

:: Arrancar el servicio ahora
"%NSSM%" start %SERVICE_NAME%

echo.
echo Servicio VANTEK instalado y arrancado.
echo.
echo Para gestionar el servicio:
echo   tools\nssm.exe edit VANTEK       — abrir panel de control
echo   tools\nssm.exe stop VANTEK       — detener
echo   tools\nssm.exe restart VANTEK    — reiniciar
echo   tools\nssm.exe remove VANTEK     — desinstalar
echo.
pause
