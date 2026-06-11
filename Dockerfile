# syntax=docker/dockerfile:1
# =============================================================================
# Vantek — Dockerfile Multi-stage Unificado y Corregido
# =============================================================================

# ─── Stage 1: Dependencias Base ──────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /build

ENV PUPPETEER_SKIP_DOWNLOAD=true

# Copiamos físicamente los manifiestos para que persistan en los stages de build
COPY package*.json ./
COPY app/backend/package.json ./app/backend/
COPY app/frontend/package.json ./app/frontend/

# El postinstall del frontend provisiona los assets de OCR (Tesseract):
# copia el worker/core desde node_modules y descarga el modelo de idioma.
# Necesita estar presente antes de `npm ci` para ejecutarse durante la instalación.
COPY app/frontend/scripts ./app/frontend/scripts

# Usamos caché únicamente para las descargas de red de npm (.npm)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspaces


# ─── Stage 2: Build del Frontend ──────────────────────────────────────────────
FROM deps AS frontend-build
# Al heredar de deps, ya tenemos los package.json y los node_modules instalados
COPY app/frontend/ ./app/frontend/
RUN npm run build --workspace=app/frontend


# ─── Stage 3: Build del Backend ───────────────────────────────────────────────
FROM deps AS backend-build
COPY app/backend/ ./app/backend/
COPY config/ ./config/
COPY version.json ./
RUN npm run build --workspace=app/backend


# ─── Stage 4: Aislamiento de Dependencias de Producción ───────────────────────
FROM node:22-bookworm-slim AS production-deps
WORKDIR /build

ENV PUPPETEER_SKIP_DOWNLOAD=true

# Copiamos de nuevo los manifiestos para aislar las dependencias limpias
COPY package*.json ./
COPY app/backend/package.json ./app/backend/

RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspaces --omit=dev


# ─── Stage 5: Runtime del Backend ─────────────────────────────────────────────
FROM node:22-bookworm-slim AS backend

# Dependencias de sistema para Puppeteer + Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-freefont-ttf \
    libnss3 \
    libxss1 \
    procps \
    gosu \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Traemos node_modules de producción y artefactos compilados
COPY --from=production-deps /build/node_modules ./node_modules
COPY --from=backend-build /build/app/backend/dist ./dist
COPY --from=backend-build /build/app/backend/package.json ./
COPY --from=backend-build /build/app/backend/tsconfig.json ./
COPY --from=backend-build /build/config ./config-default
COPY --from=backend-build /build/version.json ./

# Frontend como fallback en Express
COPY --from=frontend-build /build/app/frontend/dist ./public

# Configuración de directorios y permisos no-root (Seguridad)
RUN mkdir -p /app/data/pdfs /app/logs /app/config && \
    chown -R node:node /app

COPY --chmod=755 backend-entrypoint.sh /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "-r", "tsconfig-paths/register", "dist/index.js"]


# ─── Stage 6: Servidor Nginx (Producción Frontend) ───────────────────────────
FROM nginx:1.27-alpine AS nginx

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/vantek.conf

# Copiamos los estáticos al directorio web de Nginx
COPY --from=frontend-build /build/app/frontend/dist /var/www/vantek/html

EXPOSE 80