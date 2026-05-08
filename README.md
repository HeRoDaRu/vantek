# Vantek

**Gestión portable de facturas, albaranes, presupuestos y órdenes de trabajo**

Sistema CRM / ERP ligero y altamente adaptable pensado para pequeños negocios (reformas, talleres mecánicos, servicios, etc.).  
Un único código base que se configura por perfil según el tipo de cliente.

---

## ✨ Características principales

- **Totalmente portable**: No requiere instalación, Docker ni dependencias del sistema. Todo dentro de una carpeta.
- **Multi-perfil / Multi-negocio**: Un mismo programa sirve para reformas, talleres, fontanería, etc. cambiando solo la configuración.
- **Flujo completo**:
  - Seguimiento de leads → Presupuesto → Aceptación → Orden de trabajo → Albaranes de proveedor → Facturación
- **Albaranes de proveedores con OCR** (Tesseract.js)
- **Generación profesional de PDFs** (Puppeteer) con versiones e historial
- **Estados visuales** y semáforos en presupuestos, facturas y seguimientos
- **Autoguardado + versiones** de documentos (evita pérdida de datos)
- **Actualizaciones automáticas** seguras (GitHub Releases)
- **Servicio Windows** que se inicia automáticamente
- **Acceso móvil** vía VPN + Wake-on-LAN

---

## 🛠️ Arquitectura Técnica

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: Vite + React + TypeScript
- **Base de datos**: SQLite (con WAL)
- **PDF**: Puppeteer (HTML → PDF)
- **OCR**: Tesseract.js
- **Servicio Windows**: NSSM
- **Actualizaciones**: GitHub Releases + sistema propio de fallback

**Principios clave**:
- Un solo proceso, un solo puerto
- Sin Docker, sin instalaciones complejas
- Todo portable y fácil de respaldar (una carpeta)

---

## 📋 Cómo funciona (por perfil)

El sistema usa **entidades genéricas** que se renombran según el cliente:

| Entidad en código | Reformas          | Taller Mecánico     |
|-------------------|-------------------|---------------------|
| Agrupador         | Dirección         | Matrícula           |
| Trabajo           | Obra / Reparación | Reparación / OT     |

Puedes activar/desactivar módulos (albaranes, seguimiento, etc.) mediante un archivo de configuración.

---

## 🚀 Instalación (para el administrador)

1. Descarga la última release desde GitHub
2. Descomprime en la carpeta deseada
3. Ejecuta `Vantek.exe` (o el launcher correspondiente)
4. El servicio se instala y arranca automáticamente con Windows
5. Configura el perfil del cliente en el archivo de configuración

> **Nota**: El usuario final nunca toca código ni configuración técnica.

---

## 📁 Estructura del proyecto
/Vantek/ ├── data/                  # Base de datos y archivos del cliente ├── config/                # Perfiles de negocio y configuración ├── releases/              # Paquetes de actualizaciones ├── app/                   # Código fuente (monorepo) ├── Vantek.exe             # Launcher principal └── …                    # Archivos de servicio y logs
---

## 🛣️ Roadmap / Fases

- [x] Fase 1 – Base y autenticación
- [x] Fase 2 – Núcleo (clientes, trabajos, documentos)
- [x] Fase 3 – PDFs y versiones
- [x] Fase 4 – Actualizaciones automáticas
- [ ] Fase 5 – OCR completo + mejoras de seguimiento y dashboard

---

## 🔧 Configuración

Todo se personaliza mediante perfiles:
- Datos de la empresa
- Textos de documentos (footers)
- Módulos activos
- Conceptos por defecto (mano de obra, etc.)
- Porcentajes de IVA y margen

---

## Contribuir

Este proyecto es **privado/comercial** por el momento, pero acepto sugerencias y reportes de bugs vía Issues.

---

## Licencia

© 2026 Vantek – Uso con licencia comercial por cliente.

---

**¿Necesitas ayuda para implantarlo en tu negocio?** Contacta con el desarrollador.