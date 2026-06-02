#!/bin/sh
set -e

# ─── Inicialización de volúmenes en el primer arranque ────────────────────────
#
# Los volúmenes de Docker arrancan vacíos. Este script copia los ficheros
# por defecto si aún no existen, sin sobreescribir los que ya tenga el usuario.

echo "[vantek] Comprobando inicialización de volúmenes..."

# Config: copiar app.config.json y default.config.json si no existen
if [ ! -f /app/config/app.config.json ]; then
    echo "[vantek] Primer arranque — copiando configuración por defecto..."
    cp /app/config-default/app.config.json /app/config/app.config.json
fi

if [ ! -f /app/config/default.config.json ]; then
    cp /app/config-default/default.config.json /app/config/default.config.json
fi

# Asegurar que los directorios de datos existen
mkdir -p /app/data/pdfs
mkdir -p /app/logs

echo "[vantek] Listo. Arrancando servidor..."

# Ejecutar el comando pasado al contenedor (node dist/index.js)
exec "$@"