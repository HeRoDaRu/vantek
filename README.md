# Vantek

**[span_3](start_span)[span_4](start_span)Vantek** es una plataforma de gestión empresarial (ERP/CRM) técnica diseñada para sectores de servicios y obras, como talleres mecánicos y empresas de reformas[span_3](end_span)[span_4](end_span). [span_5](start_span)[span_6](start_span)[span_7](start_span)El sistema destaca por su arquitectura **portable**, su capacidad de **configuración por perfil** de negocio y una gestión integral del flujo de trabajo: desde el seguimiento inicial hasta la facturación final[span_5](end_span)[span_6](end_span)[span_7](end_span).

## 🚀 Características Principales

* **[span_8](start_span)Arquitectura Zero-Dependency**: Ejecución mediante Node.js portable sin necesidad de instalación en el sistema operativo[span_8](end_span).
* **[span_9](start_span)[span_10](start_span)Motor Multiperfil**: Un único código base que adapta su terminología (ej. "Matrícula" o "Dirección") y módulos según el sector[span_9](end_span)[span_10](end_span).
* **Gestión Documental de Precisión**:
    * [span_11](start_span)[span_12](start_span)Generación de presupuestos y facturas en PDF mediante Puppeteer[span_11](end_span)[span_12](end_span).
    * [span_13](start_span)[span_14](start_span)Sistema de **autoguardado silencioso** y control de hasta 10 versiones históricas por documento[span_13](end_span)[span_14](end_span).
    * [span_15](start_span)[span_16](start_span)Integración de **OCR (Tesseract.js)** para la extracción de datos en albaranes de proveedores[span_15](end_span)[span_16](end_span).
* **[span_17](start_span)[span_18](start_span)Trazabilidad Total**: Vinculación de líneas de albaranes a trabajos específicos para el cálculo automático de costes y márgenes[span_17](end_span)[span_18](end_span).
* **Automatización Industrial**:
    * [span_19](start_span)Actualizaciones automáticas desatendidas vía GitHub Releases[span_19](end_span).
    * [span_20](start_span)Servicio de Windows gestionado por NSSM que arranca sin interacción del usuario[span_20](end_span).

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
| :--- | :--- |
| **Runtime** | [span_21](start_span)Node.js portable[span_21](end_span) |
| **Backend** | [span_22](start_span)Express + TypeScript[span_22](end_span) |
| **Frontend** | [span_23](start_span)Vite + React + TypeScript[span_23](end_span) |
| **Base de Datos** | [span_24](start_span)SQLite con WAL (Write-Ahead Logging)[span_24](end_span) |
| **Servicio Windows** | [span_25](start_span)NSSM (Non-Sucking Service Manager)[span_25](end_span) |
| **Generación PDF** | [span_26](start_span)Puppeteer[span_26](end_span) |
| **OCR** | [span_27](start_span)Tesseract.js[span_27](end_span) |

## 📂 Estructura del Modelo de Datos

[span_28](start_span)El sistema organiza la información de forma jerárquica para garantizar la integridad operativa[span_28](end_span):

1.  **[span_29](start_span)Cliente**: Datos fiscales y de contacto[span_29](end_span).
2.  **[span_30](start_span)[span_31](start_span)Agrupador**: El activo sobre el que se trabaja (Dirección o Matrícula)[span_30](end_span)[span_31](end_span).
3.  **[span_32](start_span)[span_33](start_span)Trabajo**: La unidad operativa (Obra o Reparación) donde se consolidan albaranes, presupuestos y facturas[span_32](end_span)[span_33](end_span).

## ⚙️ Configuración y Perfiles

[span_34](start_span)Vantek utiliza un patrón equivalente a la internacionalización (i18n) para definir el perfil de negocio[span_34](end_span). [span_35](start_span)[span_36](start_span)El administrador configura las flags de módulos (ej: `albaranes`, `seguimiento`) y el sistema adapta toda la interfaz y lógica de negocio automáticamente[span_35](end_span)[span_36](end_span).

## 📅 Hoja de Ruta (Roadmap)

* **[span_37](start_span)Fase 1 — Base**: Estructura monorepo, Node portable, SQLite y autenticación[span_37](end_span).
* **[span_38](start_span)Fase 2 — Núcleo**: Gestión de clientes, trabajos, presupuestos y lógica de facturación[span_38](end_span).
* **[span_39](start_span)Fase 3 — Documentos**: Generación de PDF, gestión de versiones y envío por email[span_39](end_span).
* **[span_40](start_span)Fase 4 — Automatización**: Sistema de actualizaciones automáticas y log de errores[span_40](end_span).
* **[span_41](start_span)Fase 5 — OCR y Ajustes**: Integración de Tesseract.js, módulo de seguimiento y dashboard[span_41](end_span).

---
**Vantek** — *Gestión, Flujo y Trazabilidad.*
