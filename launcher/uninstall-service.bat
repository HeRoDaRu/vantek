REM ──────────────────────────────────────────────────────────────────────────────
REM uninstall-service.bat — Stop and remove the Vantek Windows service
REM ──────────────────────────────────────────────────────────────────────────────
REM
REM WHAT IT DOES
REM   Stops and removes the "VANTEK" Windows service using NSSM. Must be run as
REM   Administrator. Leaves the installed files, node\ and tools\ in place; only the
REM   service registration is removed.
REM
REM RELATIONSHIPS
REM   Used by / Calls:
REM     · Technician (manual) / install.ps1 docs → run to deregister the service
REM     · tools\nssm.exe → stop + remove the service
REM
REM INPUTS / OUTPUTS
REM   Input:  tools\nssm.exe (must exist)
REM   Output: "VANTEK" service stopped and removed from Windows
REM
REM NOTES
REM   · Windows-only. Requires Administrator privileges.
REM ──────────────────────────────────────────────────────────────────────────────

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
