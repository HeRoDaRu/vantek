# Vantek — Despliegue en Linux con Docker

## Requisitos del servidor

- Docker 24+
- Docker Compose v2 (`docker compose`, no `docker-compose`)
- 1 GB RAM mínimo (Puppeteer/Chromium necesita margen)
- 2 GB disco para la imagen + datos

## Estructura de ficheros necesaria

Coloca estos ficheros en el servidor junto al repositorio de Vantek:

```
vantek/                     ← raíz del proyecto
├── app/
├── config/
├── docker/
│   ├── backend.Dockerfile
│   ├── backend-entrypoint.sh
│   ├── nginx.Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── .dockerignore
```

## Primer arranque

```bash
# Construir las imágenes (tarda unos minutos la primera vez por Chromium)
docker compose build

# Arrancar en segundo plano
docker compose up -d

# Verificar que todo está corriendo
docker compose ps

# Ver logs en tiempo real
docker compose logs -f
```

La app estará disponible en `http://IP_DEL_SERVIDOR`.

## Datos persistentes

Los volúmenes de Docker guardan los datos entre reinicios y actualizaciones:

| Volumen | Contenido |
|---|---|
| `vantek-data` | Base de datos SQLite (`crm.db`) |
| `vantek-pdfs` | PDFs generados por Puppeteer |
| `vantek-config` | `app.config.json` y `default.config.json` |
| `vantek-logs` | Logs del backend |

**Nunca borres estos volúmenes** en producción. Para hacer backup:

```bash
# Backup de la base de datos
docker run --rm -v vantek-data:/data -v $(pwd):/backup alpine \
    tar czf /backup/vantek-db-$(date +%Y%m%d).tar.gz -C /data .
```

## Actualizar la aplicación

```bash
# Descargar el nuevo código
git pull

# Reconstruir solo lo que cambió
docker compose build

# Reiniciar con zero-downtime (backend primero, luego nginx)
docker compose up -d --no-deps backend
docker compose up -d --no-deps nginx
```

O si prefieres un cron para actualizaciones automáticas desde GitHub Releases,
el script de actualización es responsabilidad del sistema operativo del servidor
(fuera de Docker), igual que en Windows pero usando bash en lugar del launcher.

## Cambiar el puerto

Por defecto expone el puerto 80. Para cambiar a otro puerto, edita `docker-compose.yml`:

```yaml
ports:
  - "8080:80"   # expone en el puerto 8080 del servidor
```

## Añadir SSL con certbot (recomendado)

Si el servidor tiene dominio, añade SSL con Let's Encrypt:

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d tudominio.com
```

Certbot modifica la config de nginx del sistema. Si nginx corre dentro de Docker,
la forma más limpia es usar un contenedor nginx en el host o usar Traefik como
reverse proxy delante de este docker-compose.

## Solución de problemas

```bash
# Ver logs del backend
docker compose logs backend

# Ver logs de nginx
docker compose logs nginx

# Entrar al contenedor del backend para depurar
docker compose exec backend sh

# Ver el estado de la base de datos
docker compose exec backend node -e "
const db = require('better-sqlite3')('/app/data/crm.db');
console.log(db.prepare('SELECT name FROM sqlite_master WHERE type=?').all('table'));
"
```