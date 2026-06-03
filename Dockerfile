# =============================================================================
# Vantek — Dockerfile multi-stage unificado
# =============================================================================
# Stages:
#   deps            → instala node_modules (caché compartida)
#   frontend-build  → npm run build del frontend (Vite)
#   backend-build   → tsc del backend
#   backend         → runtime con Node + Chromium (target: backend)
#   nginx           → nginx sirviendo el dist de Vite (target: nginx)
# =============================================================================


# ─── Stage 1: dependencias ────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

WORKDIR /build

ENV PUPPETEER_SKIP_DOWNLOAD=true
# Copiar solo los manifiestos para aprovechar la caché de capas de Docker.
# Si no cambia ningún package.json, npm ci no se vuelve a ejecutar.
COPY package.json package-lock.json ./
COPY app/backend/package.json ./app/backend/
COPY app/frontend/package.json ./app/frontend/

RUN npm ci --workspaces


# ─── Stage 2: build del frontend ──────────────────────────────────────────────
FROM deps AS frontend-build

# Copiar solo el código fuente del frontend
COPY app/frontend/ ./app/frontend/

RUN npm run build --workspace=app/frontend


# ─── Stage 3: build del backend ───────────────────────────────────────────────
FROM deps AS backend-build

# Copiar el código fuente del backend
COPY app/backend/ ./app/backend/
COPY config/ ./config/
COPY version.json ./

RUN npm run build --workspace=app/backend


# ─── Stage 4: runtime del backend ─────────────────────────────────────────────
FROM node:22-bookworm-slim AS backend

# Dependencias de sistema para Puppeteer + Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto \
    fonts-noto-cjk \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Usar el Chromium del sistema, no descargar uno propio
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

# Traer el backend compilado desde backend-build
COPY --from=backend-build /build/app/backend/dist ./dist
COPY --from=backend-build /build/app/backend/package.json ./
COPY --from=backend-build /build/config ./config-default
COPY --from=backend-build /build/version.json ./

# Instalar solo dependencias de producción
RUN npm install --omit=dev

# El dist del frontend va aquí por si Express necesita servirlo como fallback
COPY --from=frontend-build /build/app/frontend/dist ./public

# Script de entrada que inicializa volúmenes en el primer arranque
COPY backend-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN mkdir -p data/pdfs logs config

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]


# ─── Stage 5: nginx ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS nginx

# Eliminar configuración por defecto
RUN rm /etc/nginx/conf.d/default.conf

# Configuración de Vantek
COPY nginx.conf /etc/nginx/conf.d/vantek.conf

# Dist del frontend — viene del stage frontend-build, no de npm
COPY --from=frontend-build /build/app/frontend/dist /var/www/vantek/html

# El volumen de PDFs se monta en /var/www/vantek/pdfs vía docker-compose

EXPOSE 80