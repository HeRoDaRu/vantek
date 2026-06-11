#!/bin/sh
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