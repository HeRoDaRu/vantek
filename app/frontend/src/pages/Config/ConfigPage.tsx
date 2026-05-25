import { useEffect, useState, useRef } from 'react';
import { useConfigStore } from '../../store/config.store';
import { api } from '../../utils/api';
import Spinner from '../../components/UI/Spinner';

// ─── tipos locales ────────────────────────────────────────────────────────────

interface AppConfig {
  empresa: {
    nombre: string;
    cif: string;
    direccion: string;
    telefono: string;
    email: string;
    logo_path?: string;
    mano_obra_precio_hora: number;
    mano_obra_unidad: string;
  };
  documentos: {
    iva_porcentaje: number;
    margen_defecto: number;
    max_versiones: number;
    numeracion_facturas: { contador: number; anio: number };
    footer_factura: string;
    footer_presupuesto: string;
    template_html?: string;
    template_path?: string;
  };
  dashboard: {
    grafico_tipo: string;
    dias_presupuesto_antiguo: number;
  };
  email: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      from: string;
    };
  };
  sistema: {
    ventana_inicio: string;
    ventana_fin: string;
    minutos_inactividad: number;
    email_errores: string;
  };
}

// ─── hook para cargar y guardar config ───────────────────────────────────────

function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    api.get<AppConfig>('/config/app').then(r => {
      setConfig(r.data);
      setCargando(false);
    });
  }, []);

  async function guardar(nuevo: AppConfig) {
    setGuardando(true);
    setMensaje(null);
    try {
      await api.put('/config/app', nuevo);
      setConfig(nuevo);
      setMensaje({ tipo: 'ok', texto: 'Configuración guardada correctamente' });
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al guardar la configuración' });
    } finally {
      setGuardando(false);
      setTimeout(() => setMensaje(null), 3000);
    }
  }

  return { config, setConfig, cargando, guardando, guardar, mensaje };
}

// ─── componentes de campo ─────────────────────────────────────────────────────

function Campo({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function Input({
  value, onChange, type = 'text', placeholder, disabled,
}: {
  value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <input
      className="input"
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
    />
  );
}

function Textarea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      className="input"
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ resize: 'vertical', fontFamily: 'inherit' }}
    />
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;
}

// ─── sección wrapper ──────────────────────────────────────────────────────────

function Seccion({ titulo, desc, children }: { titulo: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{titulo}</h2>
        {desc && <p style={{ fontSize: 12, color: 'var(--text-2)' }}>{desc}</p>}
      </div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

// ─── tabs de navegación lateral ───────────────────────────────────────────────

const TABS = [
  { id: 'empresa',    label: 'Empresa' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'templates',  label: 'Templates PDF' },
  { id: 'dashboard',  label: 'Dashboard' },
  { id: 'email',      label: 'Email / SMTP' },
  { id: 'sistema',    label: 'Sistema' },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── diálogo de inicio de año ─────────────────────────────────────────────────

function DialogoAnioNuevo({
  anioDoc, anioActual, onConfirmar, onPosponer,
}: {
  anioDoc: number; anioActual: number;
  onConfirmar: () => void; onPosponer: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div className="card" style={{ maxWidth: 420, width: '100%', margin: 20 }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Nuevo año {anioActual}</h2>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.6 }}>
          Las facturas estaban numeradas con el año {anioDoc}.
          ¿Quieres reiniciar la numeración desde <strong>0001</strong> para {anioActual}?
          <br /><br />
          Si tienes facturas pendientes del año anterior, puedes posponer esta acción.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onPosponer}>Posponer</button>
          <button className="btn btn-primary" onClick={onConfirmar}>Reiniciar numeración</button>
        </div>
      </div>
    </div>
  );
}

// ─── página principal ─────────────────────────────────────────────────────────

export default function ConfigPage() {
  const { config, setConfig, cargando, guardando, guardar, mensaje } = useAppConfig();
  const [tab, setTab] = useState<TabId>('empresa');

  // Diálogo de inicio de año
  const anioActual = new Date().getFullYear();
  const anioDoc = config?.documentos?.numeracion_facturas?.anio ?? anioActual;
  const [mostrarDialogoAnio, setMostrarDialogoAnio] = useState(false);

  useEffect(() => {
    if (config && anioDoc < anioActual) {
      setMostrarDialogoAnio(true);
    }
  }, [config]);

  function confirmarNuevoAnio() {
    if (!config) return;
    const nuevo = {
      ...config,
      documentos: {
        ...config.documentos,
        numeracion_facturas: { contador: 0, anio: anioActual },
      },
    };
    setConfig(nuevo);
    guardar(nuevo);
    setMostrarDialogoAnio(false);
  }

  function set(path: string[], value: any) {
    if (!config) return;
    const nuevo = JSON.parse(JSON.stringify(config));
    let obj = nuevo;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
    obj[path[path.length - 1]] = value;
    setConfig(nuevo);
  }

  function onGuardar() {
    if (config) guardar(config);
  }

  if (cargando) return <Spinner label="Cargando configuración…" />;
  if (!config) return <div style={{ padding: 32, color: 'var(--red)' }}>Error cargando la configuración</div>;

  return (
    <>
      {mostrarDialogoAnio && (
        <DialogoAnioNuevo
          anioDoc={anioDoc}
          anioActual={anioActual}
          onConfirmar={confirmarNuevoAnio}
          onPosponer={() => setMostrarDialogoAnio(false)}
        />
      )}

      <div style={{ display: 'flex', height: '100%' }}>

        {/* ── nav lateral ──────────────────────────────────────────────── */}
        <nav style={{
          width: 180, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          padding: '24px 0',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 16px', marginBottom: 8 }}>
            Configuración
          </div>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? 'var(--accent-dim)' : 'transparent',
                border: 'none', borderLeft: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
                padding: '8px 16px', textAlign: 'left', cursor: 'pointer',
                fontSize: 13, color: tab === t.id ? 'var(--accent)' : 'var(--text-2)',
                fontWeight: tab === t.id ? 600 : 400,
                transition: 'all 150ms',
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* ── contenido ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* EMPRESA */}
            {tab === 'empresa' && (
              <Seccion titulo="Datos de empresa" desc="Aparecen en la cabecera de facturas y presupuestos">
                <Campo label="Nombre o razón social *">
                  <Input value={config.empresa.nombre} onChange={v => set(['empresa', 'nombre'], v)} />
                </Campo>
                <Grid2>
                  <Campo label="CIF / NIF *">
                    <Input value={config.empresa.cif} onChange={v => set(['empresa', 'cif'], v)} />
                  </Campo>
                  <Campo label="Teléfono">
                    <Input value={config.empresa.telefono} onChange={v => set(['empresa', 'telefono'], v)} />
                  </Campo>
                </Grid2>
                <Campo label="Dirección fiscal">
                  <Input value={config.empresa.direccion} onChange={v => set(['empresa', 'direccion'], v)} />
                </Campo>
                <Campo label="Email de empresa">
                  <Input value={config.empresa.email} type="email" onChange={v => set(['empresa', 'email'], v)} />
                </Campo>
                <Grid2>
                  <Campo label="Precio mano de obra (€/h)">
                    <Input value={config.empresa.mano_obra_precio_hora} type="number" onChange={v => set(['empresa', 'mano_obra_precio_hora'], parseFloat(v))} />
                  </Campo>
                  <Campo label="Unidad mano de obra">
                    <Input value={config.empresa.mano_obra_unidad} placeholder="h" onChange={v => set(['empresa', 'mano_obra_unidad'], v)} />
                  </Campo>
                </Grid2>
              </Seccion>
            )}

            {/* DOCUMENTOS */}
            {tab === 'documentos' && (
              <Seccion titulo="Documentos" desc="Parámetros de facturas y presupuestos">
                <Grid2>
                  <Campo label="IVA por defecto (%)" hint="Se aplica al subtotal de las facturas">
                    <Input value={config.documentos.iva_porcentaje} type="number" onChange={v => set(['documentos', 'iva_porcentaje'], parseFloat(v))} />
                  </Campo>
                  <Campo label="Margen por defecto (%)" hint="Porcentaje que se aplica al coste del material">
                    <Input value={config.documentos.margen_defecto} type="number" onChange={v => set(['documentos', 'margen_defecto'], parseFloat(v))} />
                  </Campo>
                </Grid2>
                <Campo label="Versiones máximas por documento" hint="Al superar el límite se elimina la más antigua">
                  <Input value={config.documentos.max_versiones} type="number" onChange={v => set(['documentos', 'max_versiones'], parseInt(v))} />
                </Campo>
                <div style={{ padding: '12px 14px', background: 'var(--bg-3)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>NUMERACIÓN DE FACTURAS</div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>
                      Próxima factura: <strong>{String(config.documentos.numeracion_facturas.contador + 1).padStart(4, '0')}</strong> · Año <strong>{config.documentos.numeracion_facturas.anio}</strong>
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                    La numeración se gestiona automáticamente. Al inicio de año nuevo se te preguntará si reiniciar.
                  </div>
                </div>
                <Campo label="Pie de factura">
                  <Textarea value={config.documentos.footer_factura} onChange={v => set(['documentos', 'footer_factura'], v)} />
                </Campo>
                <Campo label="Pie de presupuesto">
                  <Textarea value={config.documentos.footer_presupuesto} onChange={v => set(['documentos', 'footer_presupuesto'], v)} />
                </Campo>
              </Seccion>
            )}

            {/* TEMPLATES */}
            {tab === 'templates' && (
              <Seccion titulo="Templates PDF" desc="Personaliza el HTML y CSS de los documentos generados">
                <Campo
                  label="Ruta a template externo (opcional)"
                  hint="Si se especifica, se usará este fichero HTML en lugar del template interno. Ruta relativa a la carpeta raíz del proyecto."
                >
                  <Input
                    value={config.documentos.template_path ?? ''}
                    placeholder="ej. config/mi_template.html"
                    onChange={v => set(['documentos', 'template_path'], v || undefined)}
                  />
                </Campo>
                <Campo label="HTML/CSS del template interno" hint="Editor básico. Usa {{empresa.*}}, {{cliente.*}}, {{lineas}}, {{totales}} como variables.">
                  <textarea
                    className="input"
                    rows={20}
                    value={config.documentos.template_html ?? ''}
                    onChange={e => set(['documentos', 'template_html'], e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                    placeholder="Deja vacío para usar el template por defecto"
                  />
                </Campo>
              </Seccion>
            )}

            {/* DASHBOARD */}
            {tab === 'dashboard' && (
              <Seccion titulo="Dashboard" desc="Parámetros del panel de control">
                <Campo label="Días para considerar presupuesto antiguo" hint="Presupuestos enviados sin respuesta desde hace más de X días aparecerán como urgentes">
                  <Input
                    value={config.dashboard.dias_presupuesto_antiguo}
                    type="number"
                    onChange={v => set(['dashboard', 'dias_presupuesto_antiguo'], parseInt(v))}
                  />
                </Campo>
                <Campo label="Tipo de gráfico económico" hint="Cambia la visualización del resumen económico">
                  <select
                    className="select"
                    value={config.dashboard.grafico_tipo}
                    onChange={e => set(['dashboard', 'grafico_tipo'], e.target.value)}
                  >
                    <option value="barras_lineas">Barras + línea de proyección</option>
                    <option value="barras">Solo barras</option>
                    <option value="lineas">Solo líneas</option>
                  </select>
                </Campo>
              </Seccion>
            )}

            {/* EMAIL */}
            {tab === 'email' && (
              <Seccion titulo="Email / SMTP" desc="Configuración del servidor de correo para envío de facturas y notificaciones">
                <Campo label="Servidor SMTP">
                  <Input value={config.email.smtp.host} placeholder="smtp.gmail.com" onChange={v => set(['email', 'smtp', 'host'], v)} />
                </Campo>
                <Grid2>
                  <Campo label="Puerto">
                    <Input value={config.email.smtp.port} type="number" onChange={v => set(['email', 'smtp', 'port'], parseInt(v))} />
                  </Campo>
                  <Campo label="Seguridad">
                    <select
                      className="select"
                      value={config.email.smtp.secure ? 'ssl' : 'tls'}
                      onChange={e => set(['email', 'smtp', 'secure'], e.target.value === 'ssl')}
                    >
                      <option value="tls">STARTTLS (puerto 587)</option>
                      <option value="ssl">SSL/TLS (puerto 465)</option>
                    </select>
                  </Campo>
                </Grid2>
                <Grid2>
                  <Campo label="Usuario">
                    <Input value={config.email.smtp.user} placeholder="tu@email.com" onChange={v => set(['email', 'smtp', 'user'], v)} />
                  </Campo>
                  <Campo label="Contraseña">
                    <Input value={config.email.smtp.pass} type="password" onChange={v => set(['email', 'smtp', 'pass'], v)} />
                  </Campo>
                </Grid2>
                <Campo label="Dirección de envío (From)">
                  <Input value={config.email.smtp.from} placeholder="Reformas García <info@reformas.com>" onChange={v => set(['email', 'smtp', 'from'], v)} />
                </Campo>
              </Seccion>
            )}

            {/* SISTEMA */}
            {tab === 'sistema' && (
              <Seccion titulo="Sistema" desc="Parámetros del servicio y actualizaciones automáticas">
                <Campo label="Email para notificaciones de error" hint="El launcher enviará aquí los errores críticos">
                  <Input value={config.sistema.email_errores} type="email" onChange={v => set(['sistema', 'email_errores'], v)} />
                </Campo>
                <Grid2>
                  <Campo label="Ventana actualización — inicio" hint="Hora en formato HH:MM">
                    <Input value={config.sistema.ventana_inicio} placeholder="15:00" onChange={v => set(['sistema', 'ventana_inicio'], v)} />
                  </Campo>
                  <Campo label="Ventana actualización — fin" hint="Hora en formato HH:MM">
                    <Input value={config.sistema.ventana_fin} placeholder="16:00" onChange={v => set(['sistema', 'ventana_fin'], v)} />
                  </Campo>
                </Grid2>
                <Campo label="Minutos de inactividad para actualizar" hint="Solo aplica actualizaciones si el usuario lleva X minutos sin actividad">
                  <Input value={config.sistema.minutos_inactividad} type="number" onChange={v => set(['sistema', 'minutos_inactividad'], parseInt(v))} />
                </Campo>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Actualización manual</div>
                  <UpdatePanel />
                </div>
              </Seccion>
            )}

            {/* ── botón guardar ────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
              <button className="btn btn-primary" onClick={onGuardar} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
              {mensaje && (
                <span style={{ fontSize: 13, color: mensaje.tipo === 'ok' ? 'var(--green)' : 'var(--red)' }}>
                  {mensaje.texto}
                </span>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

// ─── panel de actualización manual ───────────────────────────────────────────

function UpdatePanel() {
  const [estado, setEstado] = useState<'idle' | 'comprobando' | 'hay_update' | 'sin_update' | 'descargando' | 'listo'>('idle');
  const [version, setVersion] = useState<string | null>(null);

  async function comprobar() {
    setEstado('comprobando');
    try {
      const { data } = await api.get<{ hay_update: boolean; version?: string }>('/status/update');
      if (data.hay_update) {
        setVersion(data.version ?? null);
        setEstado('hay_update');
      } else {
        setEstado('sin_update');
      }
    } catch {
      setEstado('idle');
    }
  }

  async function aplicar(ahora: boolean) {
    setEstado('descargando');
    try {
      await api.post('/status/update/apply', { reiniciar_ahora: ahora });
      setEstado('listo');
    } catch {
      setEstado('hay_update');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {estado === 'idle' && (
        <button className="btn btn-ghost" onClick={comprobar}>Comprobar actualizaciones</button>
      )}
      {estado === 'comprobando' && (
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Comprobando…</span>
      )}
      {estado === 'sin_update' && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--green)' }}>✓ Tienes la versión más reciente</span>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setEstado('idle')}>
            Volver a comprobar
          </button>
        </div>
      )}
      {estado === 'hay_update' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--accent)' }}>
            Nueva versión disponible: <strong>{version}</strong>
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => aplicar(false)}>
              Descargar y aplicar al reiniciar
            </button>
            <button className="btn btn-primary" onClick={() => aplicar(true)}>
              Descargar y reiniciar ahora
            </button>
          </div>
        </div>
      )}
      {estado === 'descargando' && (
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Descargando actualización…</span>
      )}
      {estado === 'listo' && (
        <span style={{ fontSize: 13, color: 'var(--green)' }}>✓ Actualización aplicada. El sistema se reiniciará cuando sea posible.</span>
      )}
    </div>
  );
}