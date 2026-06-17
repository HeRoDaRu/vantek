#!/bin/sh
# ──────────────────────────────────────────────────────────────────────────────
# backend-entrypoint.sh — Initialize Docker volumes on first boot, then exec server
# ──────────────────────────────────────────────────────────────────────────────
#
# WHAT IT DOES
#   Container entrypoint for the backend. Ensures the data/pdfs, logs and config
#   directories exist with the right ownership, and on first boot seeds the empty
#   config volume from the bundled templates (stamping the current year into the
#   invoice numbering) without overwriting any user-edited files. Then drops to the
#   node user and execs the passed command (the server).
#
# RELATIONSHIPS
#   Used by / Calls:
#     · Dockerfile ENTRYPOINT / docker-compose → runs on backend container start
#     · node (one-off script) → renders app.config.json from app.config.template.json
#     · gosu → drop privileges to the node user before exec
#
# INPUTS / OUTPUTS
#   Input:  /app/config-default/*.template.json, the container CMD arguments
#   Output: /app/config/app.config.json, /app/config/profile.config.json,
#           created /app/data/pdfs, /app/logs, /app/config dirs; started server
#
# NOTES
#   · Linux/Docker-only. Idempotent: existing config files are never overwritten.
# ──────────────────────────────────────────────────────────────────────────────
set -e

# ─── Inicialización de volúmenes en el primer arranque ────────────────────────
#
# Los volúmenes de Docker arrancan vacíos. Este script copia los ficheros
# por defecto si aún no existen, sin sobreescribir los que ya tenga el usuario.

echo "[Vantek] Comprobando inicialización de volúmenes..."

# Asegurar que los directorios de datos existen
mkdir -p /app/data/pdfs /app/logs /app/config
chown -R node:node /app/data /app/logs /app/config

# Config: copiar app.config.json y profile.config.json si no existen
if [ ! -f /app/config/app.config.json ]; then
    echo "[Vantek] Primer arranque — copiando configuración por defecto..."
    node -e "
        const t = require('/app/config-default/app.config.template.json');
        t.documentos.numeracion_factura.anio = new Date().getFullYear();
        require('fs').writeFileSync(
            '/app/config/app.config.json',
            JSON.stringify(t, null, 2)
        );
    "
fi

if [ ! -f /app/config/profile.config.json ]; then
    cp /app/config-default/profile.config.template.json /app/config/profile.config.json
fi

echo "[Vantek] Listo. Arrancando servidor..."
exec gosu node "$@"