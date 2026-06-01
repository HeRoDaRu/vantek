import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useClientesStore, Agrupador, TrabajoBrief } from '@store/clientes.store';
import { useConfigStore } from '@store/config.store';
import Spinner from '@ui/Spinner';
import Modal from '@ui/Modal';
import ClienteModal from '@pages/Clientes/components/Modal/ClienteModal';
import AgrupadorModal from '@pages/Clientes/components/Modal/AgrupadorModal';
import TrabajoModal from '@pages/Clientes/components/Modal/TrabajoModal';
import api from '@utils/api';

// Icono chevron
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="14" height="14" viewBox="0 0 14 14"
    fill="none" stroke="currentColor" strokeWidth="1.5"
    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: '150ms ease', flexShrink: 0 }}
  >
    <path d="M5 3l4 4-4 4" />
  </svg>
);

// ─── Tipos locales para la lógica de documentos ───────────────────────────────

type EstadoFactura = 'borrador' | 'cerrada' | 'entregada' | 'pendiente_pago' | 'pagada';
type EstadoPresupuesto = 'borrador' | 'enviado' | 'aceptado' | 'rechazado' | 'caducado';

interface DocumentoExistente {
  id: string;
  estado: EstadoFactura | EstadoPresupuesto;
  numero?: string;
}

// ─── Hook para consultar documentos existentes de un trabajo ─────────────────

async function getFacturasDelTrabajo(trabajoId: string): Promise<DocumentoExistente[]> {
  try {
    const res = await api.get('/facturas', { params: { trabajo_id: trabajoId } });
    return res.data.data ?? res.data ?? [];
  } catch {
    return [];
  }
}

async function getPresupuestosDelTrabajo(trabajoId: string): Promise<DocumentoExistente[]> {
  try {
    const res = await api.get('/presupuestos', { params: { trabajo_id: trabajoId } });
    return res.data.data ?? res.data ?? [];
  } catch {
    return [];
  }
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ClienteFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selected, loading, error, fetchById, update, createAgrupador, updateAgrupador, createTrabajo } = useClientesStore();
  const { t } = useConfigStore();

  // Agrupadores expandidos
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Modales de entidades
  const [editClienteOpen, setEditClienteOpen] = useState(false);
  const [nuevoAgrupadorOpen, setNuevoAgrupadorOpen] = useState(false);
  const [editAgrupador, setEditAgrupador] = useState<Agrupador | null>(null);
  const [nuevoTrabajo, setNuevoTrabajo] = useState<string | null>(null);
  const [editTrabajo, setEditTrabajo] = useState<{ agrupadorId: string; trabajo: TrabajoBrief } | null>(null);

  // Estado de la lógica de documentos
  const [accionEnCurso, setAccionEnCurso] = useState(false);

  // ─── Diálogos de decisión ─────────────────────────────────────────────────

  // Factura en borrador existente
  const [dialogFacturaBorrador, setDialogFacturaBorrador] = useState<{ trabajo: TrabajoBrief; facturaId: string } | null>(null);

  // Factura cerrada existente → rectificativa o gastos
  const [dialogFacturaCerrada, setDialogFacturaCerrada] = useState<{ trabajo: TrabajoBrief; facturaId: string; numero?: string } | null>(null);

  // Presupuesto en borrador/enviado existente
  const [dialogPresupuestoBorrador, setDialogPresupuestoBorrador] = useState<{ trabajo: TrabajoBrief; presupuestoId: string; estado: string } | null>(null);

  // Presupuesto rechazado/caducado → nuevo o reabrir
  const [dialogPresupuestoRechazado, setDialogPresupuestoRechazado] = useState<{ trabajo: TrabajoBrief; presupuestoId: string } | null>(null);

  // Presupuesto aceptado → confirmación de ampliación
  const [dialogPresupuestoAceptado, setDialogPresupuestoAceptado] = useState<{ trabajo: TrabajoBrief } | null>(null);

  useEffect(() => {
    if (id) fetchById(id);
  }, [id, fetchById]);

  const toggleExpanded = (aid: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(aid) ? next.delete(aid) : next.add(aid);
      return next;
    });

  // ─── Lógica de nueva factura ──────────────────────────────────────────────

  const handleNuevaFactura = useCallback(async (trabajo: TrabajoBrief) => {
    setAccionEnCurso(true);
    try {
      const facturas = await getFacturasDelTrabajo(trabajo.id);

      if (facturas.length === 0) {
        // Caso limpio: crear directamente
        const res = await api.post('/facturas', { trabajo_id: trabajo.id });
        const nuevaId = res.data.data?.id ?? res.data.id;
        navigate(`/facturas/${nuevaId}`);
        return;
      }

      // Buscar la más relevante: prioridad borrador > cerrada/superior
      const borrador = facturas.find(f => f.estado === 'borrador');
      if (borrador) {
        setDialogFacturaBorrador({ trabajo, facturaId: borrador.id });
        return;
      }

      // Hay alguna cerrada o en estado posterior
      const cerrada = facturas.find(f =>
        ['cerrada', 'entregada', 'pendiente_pago', 'pagada'].includes(f.estado as string)
      );
      if (cerrada) {
        setDialogFacturaCerrada({ trabajo, facturaId: cerrada.id, numero: cerrada.numero });
        return;
      }

      // Fallback: crear nueva igualmente
      const res = await api.post('/facturas', { trabajo_id: trabajo.id });
      const nuevaId = res.data.data?.id ?? res.data.id;
      navigate(`/facturas/${nuevaId}`);
    } catch (e: any) {
      console.error('Error al gestionar factura:', e);
    } finally {
      setAccionEnCurso(false);
    }
  }, [navigate]);

  // Crear rectificativa: copia líneas de la factura original + marca
  const handleCrearRectificativa = useCallback(async (facturaOriginalId: string, trabajoId: string) => {
    setDialogFacturaCerrada(null);
    try {
      const res = await api.post('/facturas', {
        trabajo_id: trabajoId,
        factura_origen_id: facturaOriginalId,
        es_rectificativa: true,
      });
      const nuevaId = res.data.data?.id ?? res.data.id;
      navigate(`/facturas/${nuevaId}`);
    } catch (e: any) {
      console.error('Error al crear rectificativa:', e);
    }
  }, [navigate]);

  // Crear factura de gastos posteriores: vacía
  const handleCrearFacturaGastos = useCallback(async (trabajoId: string) => {
    setDialogFacturaCerrada(null);
    try {
      const res = await api.post('/facturas', { trabajo_id: trabajoId });
      const nuevaId = res.data.data?.id ?? res.data.id;
      navigate(`/facturas/${nuevaId}`);
    } catch (e: any) {
      console.error('Error al crear factura de gastos:', e);
    }
  }, [navigate]);

  // ─── Lógica de nuevo presupuesto ─────────────────────────────────────────

  const handleNuevoPresupuesto = useCallback(async (trabajo: TrabajoBrief) => {
    setAccionEnCurso(true);
    try {
      const presupuestos = await getPresupuestosDelTrabajo(trabajo.id);

      if (presupuestos.length === 0) {
        // Caso limpio: crear directamente
        const res = await api.post('/presupuestos', { trabajo_id: trabajo.id });
        const nuevoId = res.data.data?.id ?? res.data.id;
        navigate(`/presupuestos/${nuevoId}`);
        return;
      }

      // Borrador o enviado en curso: abrir el existente con warning
      const enCurso = presupuestos.find(p => ['borrador', 'enviado'].includes(p.estado as string));
      if (enCurso) {
        setDialogPresupuestoBorrador({ trabajo, presupuestoId: enCurso.id, estado: enCurso.estado as string });
        return;
      }

      // Aceptado: confirmar si es ampliación/reducción
      const aceptado = presupuestos.find(p => p.estado === 'aceptado');
      if (aceptado) {
        setDialogPresupuestoAceptado({ trabajo });
        return;
      }

      // Rechazado o caducado: ofrecer nuevo o reabrir
      const rechazadoOCaducado = presupuestos.find(p =>
        ['rechazado', 'caducado'].includes(p.estado as string)
      );
      if (rechazadoOCaducado) {
        setDialogPresupuestoRechazado({ trabajo, presupuestoId: rechazadoOCaducado.id });
        return;
      }

      // Fallback
      const res = await api.post('/presupuestos', { trabajo_id: trabajo.id });
      const nuevoId = res.data.data?.id ?? res.data.id;
      navigate(`/presupuestos/${nuevoId}`);
    } catch (e: any) {
      console.error('Error al gestionar presupuesto:', e);
    } finally {
      setAccionEnCurso(false);
    }
  }, [navigate]);

  const handleCrearPresupuestoNuevo = useCallback(async (trabajoId: string) => {
    setDialogPresupuestoRechazado(null);
    setDialogPresupuestoAceptado(null);
    try {
      const res = await api.post('/presupuestos', { trabajo_id: trabajoId });
      const nuevoId = res.data.data?.id ?? res.data.id;
      navigate(`/presupuestos/${nuevoId}`);
    } catch (e: any) {
      console.error('Error al crear presupuesto:', e);
    }
  }, [navigate]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return <Spinner label="Cargando…" />;

  if (error || !selected || selected.id !== id) {
    return (
      <div className="empty">
        <span style={{ color: 'var(--red)' }}>{error ?? `${t('entidades.cliente')} no encontrado`}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/clientes')}>
          ← Volver
        </button>
      </div>
    );
  }

  const c = selected;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col gap-1">
          <div className="breadcrumb">
            <Link to="/clientes">{t('entidades.clientes')}</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{c.nombre}</span>
          </div>
          <h1 className="page-title">{c.nombre}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setEditClienteOpen(true)}>
            Editar
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Info del cliente */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <div className="form-grid form-grid-3" style={{ gap: 16 }}>
              {c.empresa && (
                <div>
                  <div className="form-label">Empresa</div>
                  <div style={{ color: 'var(--text)' }}>{c.empresa}</div>
                </div>
              )}
              {c.dni_cif && (
                <div>
                  <div className="form-label">DNI / CIF</div>
                  <div className="mono">{c.dni_cif}</div>
                </div>
              )}
              {c.telefono && (
                <div>
                  <div className="form-label">Teléfono</div>
                  <div>{c.telefono}</div>
                </div>
              )}
              {c.email && (
                <div>
                  <div className="form-label">Email</div>
                  <div>{c.email}</div>
                </div>
              )}
              {c.notas && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="form-label">Notas</div>
                  <div className="text-secondary">{c.notas}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botones de acceso rápido a listados del cliente */}
        <div className="flex items-center gap-2" style={{ marginBottom: 20 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(`/facturas?trabajo_label=${encodeURIComponent(c.nombre)}&cliente=${encodeURIComponent(c.nombre)}`)}
          >
            Ver todas las facturas
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(`/presupuestos?cliente=${encodeURIComponent(c.nombre)}`)}
          >
            Ver todos los presupuestos
          </button>
        </div>

        {/* Agrupadores */}
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('entidades.agrupadores')}
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={() => setNuevoAgrupadorOpen(true)}>
            + {t('entidades.agrupador')}
          </button>
        </div>

        {(!c.agrupadores || c.agrupadores.length === 0) && (
          <div className="empty">
            <span className="empty-title">Sin {t('entidades.agrupadores').toLowerCase()}</span>
            <span className="empty-desc">
              Crea la primera {t('entidades.agrupador').toLowerCase()} para organizar los {t('entidades.trabajos').toLowerCase()}.
            </span>
          </div>
        )}

        {c.agrupadores?.map(agrupador => {
          const isOpen = expanded.has(agrupador.id);
          return (
            <div key={agrupador.id} className="accordion" style={{ marginBottom: 8 }}>
              <div className="accordion-header" onClick={() => toggleExpanded(agrupador.id)}>
                <div className="accordion-header-left">
                  <ChevronIcon open={isOpen} />
                  <span className="font-medium" style={{ color: 'var(--text)' }}>{agrupador.label}</span>
                  {agrupador.descripcion && (
                    <span className="text-secondary text-sm truncate" style={{ maxWidth: 300 }}>
                      {agrupador.descripcion}
                    </span>
                  )}
                  <span
                    className="text-muted text-xs"
                    style={{ background: 'var(--bg-4)', padding: '1px 7px', borderRadius: 99 }}
                  >
                    {agrupador.trabajos?.length ?? 0} {t('entidades.trabajos').toLowerCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditAgrupador(agrupador)}>
                    Editar
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="accordion-body">
                  <div
                    className="flex items-center justify-between"
                    style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}
                  >
                    <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {t('entidades.trabajos')}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setNuevoTrabajo(agrupador.id)}>
                      + {t('entidades.trabajo')}
                    </button>
                  </div>

                  {(!agrupador.trabajos || agrupador.trabajos.length === 0) && (
                    <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                      Sin {t('entidades.trabajos').toLowerCase()}
                    </div>
                  )}

                  {agrupador.trabajos?.map(trabajo => (
                    <div
                      key={trabajo.id}
                      className="flex items-center justify-between"
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--border)',
                        transition: 'var(--transition)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium" style={{ color: 'var(--text)' }}>{trabajo.nombre}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Ver facturas del trabajo (filtrado) */}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(
                            `/facturas?trabajo=${trabajo.id}&trabajo_label=${encodeURIComponent(trabajo.nombre)}`
                          )}
                        >
                          Facturas
                        </button>
                        {/* Nueva factura / acción inteligente */}
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={accionEnCurso}
                          onClick={() => handleNuevaFactura(trabajo)}
                        >
                          + Factura
                        </button>
                        {/* Ver presupuestos del trabajo (filtrado) */}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(
                            `/presupuestos?trabajo=${trabajo.id}&trabajo_label=${encodeURIComponent(trabajo.nombre)}`
                          )}
                        >
                          Presupuestos
                        </button>
                        {/* Nuevo presupuesto / acción inteligente */}
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={accionEnCurso}
                          onClick={() => handleNuevoPresupuesto(trabajo)}
                        >
                          + Presupuesto
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setEditTrabajo({ agrupadorId: agrupador.id, trabajo })}
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Modales de entidades ─────────────────────────────────────────── */}

      <ClienteModal
        open={editClienteOpen}
        onClose={() => setEditClienteOpen(false)}
        onSubmit={async data => { await update(c.id, data); setEditClienteOpen(false); }}
        titulo={`Editar ${t('entidades.cliente')}`}
        inicial={c}
      />

      <AgrupadorModal
        open={nuevoAgrupadorOpen}
        onClose={() => setNuevoAgrupadorOpen(false)}
        onSubmit={async data => { await createAgrupador(c.id, data); setNuevoAgrupadorOpen(false); }}
      />

      <AgrupadorModal
        open={!!editAgrupador}
        onClose={() => setEditAgrupador(null)}
        onSubmit={async data => {
          if (!editAgrupador) return;
          await updateAgrupador(c.id, editAgrupador.id, data);
          setEditAgrupador(null);
        }}
        inicial={editAgrupador ?? undefined}
      />

      <TrabajoModal
        open={!!nuevoTrabajo}
        onClose={() => setNuevoTrabajo(null)}
        onSubmit={async data => {
          if (!nuevoTrabajo) return;
          await createTrabajo(c.id, nuevoTrabajo, data);
          setNuevoTrabajo(null);
        }}
      />

      <TrabajoModal
        open={!!editTrabajo}
        onClose={() => setEditTrabajo(null)}
        onSubmit={async _data => {
          // updateTrabajo pendiente de implementar en el store
          setEditTrabajo(null);
        }}
        inicial={editTrabajo?.trabajo}
      />

      {/* ─── Diálogos de decisión — facturas ─────────────────────────────── */}

      {dialogFacturaBorrador && (
        <Modal
          title="Ya tienes un borrador abierto"
          size="sm"
          onClose={() => setDialogFacturaBorrador(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDialogFacturaBorrador(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  navigate(`/facturas/${dialogFacturaBorrador.facturaId}`);
                  setDialogFacturaBorrador(null);
                }}
              >
                Abrir borrador
              </button>
            </>
          }
        >
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
            Ya existe una factura en borrador para «{dialogFacturaBorrador.trabajo.nombre}».
            Deberías haberla abierto directamente desde el menú de Facturas.
            Se abrirá ese borrador.
          </p>
        </Modal>
      )}

      {dialogFacturaCerrada && (
        <Modal
          title="Ya existe una factura para esta obra"
          size="sm"
          onClose={() => setDialogFacturaCerrada(null)}
          footer={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setDialogFacturaCerrada(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => navigate(`/facturas/${dialogFacturaCerrada.facturaId}`)}
              >
                Ver factura {dialogFacturaCerrada.numero ? `(${dialogFacturaCerrada.numero})` : 'existente'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => handleCrearRectificativa(
                  dialogFacturaCerrada.facturaId,
                  dialogFacturaCerrada.trabajo.id
                )}
              >
                Rectificativa
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleCrearFacturaGastos(dialogFacturaCerrada.trabajo.id)}
              >
                Gastos posteriores
              </button>
            </div>
          }
        >
          <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 12 }}>
            La obra «{dialogFacturaCerrada.trabajo.nombre}» ya tiene una factura
            {dialogFacturaCerrada.numero ? ` (nº ${dialogFacturaCerrada.numero})` : ''}.
            ¿Qué quieres hacer?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 10px', background: 'var(--bg-3)', borderRadius: 'var(--radius)' }}>
              <strong style={{ color: 'var(--text-2)' }}>Rectificativa:</strong> copia las líneas de la factura original.
              Se indicará que es una corrección.
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 10px', background: 'var(--bg-3)', borderRadius: 'var(--radius)' }}>
              <strong style={{ color: 'var(--text-2)' }}>Gastos posteriores:</strong> factura nueva vacía para gastos adicionales.
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Diálogos de decisión — presupuestos ─────────────────────────── */}

      {dialogPresupuestoBorrador && (
        <Modal
          title="Ya tienes un presupuesto en curso"
          size="sm"
          onClose={() => setDialogPresupuestoBorrador(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDialogPresupuestoBorrador(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  navigate(`/presupuestos/${dialogPresupuestoBorrador.presupuestoId}`);
                  setDialogPresupuestoBorrador(null);
                }}
              >
                Abrir presupuesto
              </button>
            </>
          }
        >
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
            Ya existe un presupuesto en estado «{dialogPresupuestoBorrador.estado}» para
            «{dialogPresupuestoBorrador.trabajo.nombre}».
            Edítalo y guarda para generar una nueva versión.
          </p>
        </Modal>
      )}

      {dialogPresupuestoRechazado && (
        <Modal
          title="El presupuesto anterior fue rechazado o caducó"
          size="sm"
          onClose={() => setDialogPresupuestoRechazado(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDialogPresupuestoRechazado(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  navigate(`/presupuestos/${dialogPresupuestoRechazado.presupuestoId}`);
                  setDialogPresupuestoRechazado(null);
                }}
              >
                Reabrir anterior
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleCrearPresupuestoNuevo(dialogPresupuestoRechazado.trabajo.id)}
              >
                Crear nuevo
              </button>
            </>
          }
        >
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
            ¿Quieres reabrir el presupuesto anterior para modificarlo,
            o crear uno completamente nuevo?
          </p>
        </Modal>
      )}

      {dialogPresupuestoAceptado && (
        <Modal
          title="El presupuesto ya fue aceptado"
          size="sm"
          onClose={() => setDialogPresupuestoAceptado(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDialogPresupuestoAceptado(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleCrearPresupuestoNuevo(dialogPresupuestoAceptado.trabajo.id)}
              >
                Crear presupuesto de ampliación
              </button>
            </>
          }
        >
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
            El trabajo «{dialogPresupuestoAceptado.trabajo.nombre}» ya tiene un presupuesto aceptado.
            Si hay un cambio de alcance (ampliación o reducción) puedes crear un nuevo presupuesto independiente.
          </p>
        </Modal>
      )}
    </div>
  );
}
