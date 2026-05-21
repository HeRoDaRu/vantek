@echo off
:: ============================================================
:: VANTEK — Desinstalación del servicio de Windows
:: Ejecutar como Administrador
:: ============================================================

SET SERVICE_NAME=VANTEK

echo Deteniendo y desinstalando servicio VANTEK...
nssm stop %SERVICE_NAME%
nssm remove %SERVICE_NAME% confirm

echo.
echo Servicio VANTEK desinstalado.
pause
