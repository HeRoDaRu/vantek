# Vantek

**[span_0](start_span)[span_1](start_span)Vantek** es una plataforma de gestión empresarial (ERP/CRM) técnica diseñada específicamente para sectores de servicios y obras, como talleres mecánicos y empresas de reformas[span_0](end_span)[span_1](end_span). [span_2](start_span)[span_3](start_span)[span_4](start_span)El sistema destaca por su arquitectura **portable**, su capacidad de **configuración por perfil de negocio** y una gestión integral del flujo de trabajo: desde el seguimiento inicial hasta la facturación final[span_2](end_span)[span_3](end_span)[span_4](end_span).

---

## 🚀 Características Principales

* **[span_5](start_span)Arquitectura Zero-Dependency**: Ejecución mediante Node.js portable sin necesidad de instalación en el sistema operativo[span_5](end_span).
* **[span_6](start_span)[span_7](start_span)Motor Multiperfil**: Un único código base que adapta terminología (ej. "Matrícula" o "Dirección") y módulos activos mediante un sistema de flags equivalente al i18n[span_6](end_span)[span_7](end_span).
* **Gestión Documental de Precisión**:
    * [span_8](start_span)[span_9](start_span)[span_10](start_span)Generación de presupuestos y facturas en PDF mediante **Puppeteer**[span_8](end_span)[span_9](end_span)[span_10](end_span).
    * [span_11](start_span)[span_12](start_span)Sistema de **autoguardado silencioso** y control de versiones históricas (hasta 10 versiones con sus respectivos PDFs)[span_11](end_span)[span_12](end_span).
    * [span_13](start_span)[span_14](start_span)Integración de **OCR (Tesseract.js)** para la extracción de datos en albaranes de proveedores[span_13](end_span)[span_14](end_span).
* **[span_15](start_span)Trazabilidad Total**: Vinculación de líneas de albaranes a trabajos específicos para el cálculo automático de costes y márgenes de beneficio[span_15](end_span).
* **Automatización Industrial**:
    * [span_16](start_span)Actualizaciones automáticas desatendidas vía **GitHub Releases** con verificación de inactividad[span_16](end_span).
    * [span_17](start_span)Servicio de Windows gestionado por **NSSM** que arranca automáticamente sin interacción del usuario[span_17](end_span).

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
| :--- | :--- |
| **Runtime** | [span_18](start_span)Node.js portable[span_18](end_span) |
| **Backend** | [span_19](start_span)Express + TypeScript[span_19](end_span) |
| **Frontend** | [span_20](start_span)Vite + React + TypeScript[span_20](end_span) |
| **Base de Datos** | [span_21](start_span)SQLite con WAL (Write-Ahead Logging)[span_21](end_span) |
| **Servicio Windows** | [span_22](start_span)NSSM (Non-Sucking Service Manager)[span_22](end_span) |
| **Generación PDF** | [span_23](start_span)Puppeteer (HTML/CSS → PDF)[span_23](end_span) |
| **OCR** | [span_24](start_span)Tesseract.js[span_24](end_span) |
| **Email** | [span_25](start_span)Nodemailer[span_25](end_span) |

---

## 📂 Estructura del Modelo de Datos

[span_26](start_span)El sistema organiza la información de forma jerárquica para garantizar la integridad operativa[span_26](end_span):

1.  **[span_27](start_span)Cliente**: Entidad principal con datos fiscales y de contacto[span_27](end_span).
2.  **[span_28](start_span)[span_29](start_span)Agrupador**: El activo sobre el que se trabaja, configurado por perfil (ej: Dirección en reformas o Matrícula en talleres)[span_28](end_span)[span_29](end_span).
3.  **[span_30](start_span)Trabajo**: La unidad operativa (Obra o Reparación) donde se consolidan presupuestos, albaranes y facturas[span_30](end_span).

---

## ⚙️ Configuración y Perfiles

[span_31](start_span)[span_32](start_span)Vantek utiliza un patrón de configuración por instalación que define la terminología y activa o desactiva módulos (albaranes, seguimiento, matrículas)[span_31](end_span)[span_32](end_span). [span_33](start_span)El usuario final nunca interactúa con esta configuración, la cual es gestionada por el administrador para asegurar la coherencia del perfil de negocio[span_33](end_span).

---

## 📅 Hoja de Ruta (Roadmap)

* **[span_34](start_span)Fase 1 — Base**: Estructura monorepo, Node portable + NSSM, SQLite y autenticación[span_34](end_span).
* **[span_35](start_span)Fase 2 — Núcleo**: Gestión de clientes, agrupadores, trabajos, albaranes manuales y lógica de facturación[span_35](end_span).
* **[span_36](start_span)Fase 3 — Documentos**: Generación de PDF con Puppeteer, gestión de versiones y envío por email[span_36](end_span).
* **[span_37](start_span)Fase 4 — Automatización**: Sistema de actualizaciones automáticas, launcher con fallback y notificaciones de error[span_37](end_span).
* **[span_38](start_span)Fase 5 — OCR y Ajustes**: Integración de Tesseract.js, módulo de seguimiento y dashboard económico[span_38](end_span).

---
**Vantek** — *Gestión, Flujo y Trazabilidad.*
