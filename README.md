# Vantek

Sistema local de gestión de facturas, presupuestos y obras.

## Estructura

```
vantek/
├── app/
│   ├── backend/     Express + TypeScript + SQLite
│   └── frontend/    Vite + React + TypeScript
├── launcher/        Arranque automático y actualizaciones
├── config/          Configuración del perfil y la app
├── data/            Base de datos SQLite (generada automáticamente)
├── logs/            Logs del servicio
├── node/            Node.js portable (producción)
└── version.json     Versión actual
```

## Requisitos (desarrollo)

- Node.js 18+
- npm 8+

## Desarrollo

```bash
npm install
npm run dev
```

## Compilar para producción

```bash
npm run build
```

## Instalación en producción (Windows)

1. Copiar la carpeta completa al equipo destino
2. Asegurarse de que `node/node.exe` existe (Node.js portable)
3. Compilar el proyecto: `npm run build`
4. Configurar `config/app.config.json`
5. Ejecutar como Administrador: `launcher/install-service.bat`

## Perfiles disponibles

El perfil de negocio se configura en `config/profile.config.json`.

| Perfil | agrupador | trabajo |
|--------|-----------|---------|
| reformas | Dirección | Obra |
| taller | Matrícula | Reparación |

## Actualización de la app

Las actualizaciones son automáticas (descarga desde GitHub Releases).
También se pueden aplicar manualmente desde Configuración > Sistema.
