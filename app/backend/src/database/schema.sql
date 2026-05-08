-- =============================================
-- ESQUEMA INICIAL VANTEK CRM - Mayo 2026
-- =============================================

PRAGMA foreign_keys = ON;

-- ====================== CLIENTES ======================
CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    nif_cif TEXT UNIQUE,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    notas TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ====================== AGRUPADORES ======================
CREATE TABLE IF NOT EXISTS agrupadores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,                    -- Dirección o Matrícula
    tipo TEXT DEFAULT 'direccion',           -- 'direccion' o 'matricula'
    detalles TEXT,                           -- Dirección completa o marca/modelo
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);

-- ====================== TRABAJOS ======================
CREATE TABLE IF NOT EXISTS trabajos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    agrupador_id INTEGER,
    nombre TEXT NOT NULL,                    -- Nombre de la obra/reparación
    descripcion TEXT,
    margen_porcentaje REAL DEFAULT 30.0,     -- Heredado y editable
    estado TEXT DEFAULT 'en_curso',
    fecha_inicio DATE,
    fecha_fin DATE,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (agrupador_id) REFERENCES agrupadores(id) ON DELETE SET NULL
);

-- ====================== DOCUMENTOS BASE ======================
CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,                      -- 'factura' | 'presupuesto'
    numero TEXT,                             -- Solo para facturas
    trabajo_id INTEGER NOT NULL,
    cliente_id INTEGER NOT NULL,
    agrupador_id INTEGER,
    subtotal REAL DEFAULT 0,
    iva REAL DEFAULT 21,
    total REAL DEFAULT 0,
    estado TEXT DEFAULT 'borrador',          -- borrador, cerrada, entregada, pagada, etc.
    fecha_emision DATE,
    fecha_vencimiento DATE,
    notas TEXT,
    pdf_path TEXT,                           -- Ruta relativa al PDF
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trabajo_id) REFERENCES trabajos(id) ON DELETE CASCADE,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (agrupador_id) REFERENCES agrupadores(id) ON DELETE SET NULL
);

-- ====================== LÍNEAS DE DOCUMENTO ======================
CREATE TABLE IF NOT EXISTS documento_lineas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    documento_id INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    cantidad REAL DEFAULT 1,
    precio_unitario REAL NOT NULL,
    margen REAL DEFAULT 0,                   -- Porcentaje o monto
    es_de_albaran BOOLEAN DEFAULT 0,         -- Si viene de un albarán
    albaran_linea_id INTEGER,                -- Referencia si aplica
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE
);

-- ====================== ALBARANES ======================
CREATE TABLE IF NOT EXISTS albaranes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor TEXT,
    fecha DATE,
    numero TEXT,
    total_coste REAL,
    pdf_path TEXT,                           -- Albarán escaneado/foto
    estado TEXT DEFAULT 'sin_asignar',       -- sin_asignar, asignado, parcial
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS albaran_asignaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    albaran_id INTEGER NOT NULL,
    trabajo_id INTEGER NOT NULL,
    linea_id INTEGER,                        -- Si se asigna línea por línea
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (albaran_id) REFERENCES albaranes(id) ON DELETE CASCADE,
    FOREIGN KEY (trabajo_id) REFERENCES trabajos(id) ON DELETE CASCADE
);

-- ====================== SEGUIMIENTO ======================
CREATE TABLE IF NOT EXISTS seguimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT DEFAULT 'reformas',            -- reformas o taller
    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    dni_cif TEXT,
    direccion TEXT,
    matricula TEXT,                          -- Para taller
    problema TEXT,
    estado TEXT DEFAULT 'nuevo',
    fecha_visita DATE,
    presupuesto_id INTEGER,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ====================== VERSIONES / HISTORIAL ======================
CREATE TABLE IF NOT EXISTS documento_versiones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    documento_id INTEGER NOT NULL,
    version_num INTEGER NOT NULL,
    pdf_path TEXT,
    cambios TEXT,                            -- JSON o texto breve
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_clientes_nif ON clientes(nif_cif);
CREATE INDEX idx_trabajos_cliente ON trabajos(cliente_id);
CREATE INDEX idx_documentos_trabajo ON documentos(trabajo_id);
CREATE INDEX idx_documentos_estado ON documentos(estado);
CREATE INDEX idx_seguimientos_estado ON seguimientos(estado);

-- Trigger para actualizar timestamp
CREATE TRIGGER IF NOT EXISTS update_timestamp 
AFTER UPDATE ON clientes, trabajos, documentos
BEGIN
    UPDATE clientes SET actualizado_en = CURRENT_TIMESTAMP WHERE id = NEW.id;
    -- (se pueden añadir más triggers)
END;