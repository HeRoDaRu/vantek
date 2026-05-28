import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useClientesStore, Agrupador, TrabajoBrief } from '@store/clientes.store';
import { useConfigStore } from '@store/config.store';
import Spinner from '@ui/Spinner';
import ClienteModal from '@pages/Clientes/components/Modal/ClienteModal';
import AgrupadorModal from '@pages/Clientes/components/Modal/AgrupadorModal';
import TrabajoModal from '@pages/Clientes/components/Modal/TrabajoModal';

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

export default function ClienteFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selected, loading, error, fetchById, update, remove, createAgrupador, updateAgrupador, removeAgrupador, createTrabajo } = useClientesStore();
  const { t } = useConfigStore();

  // Agrupadores expandidos
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Modales
  const [editClienteOpen, setEditClienteOpen] = useState(false);
  const [nuevoAgrupadorOpen, setNuevoAgrupadorOpen] = useState(false);
  const [editAgrupador, setEditAgrupador] = useState<Agrupador | null>(null);
  const [nuevoTrabajo, setNuevoTrabajo] = useState<string | null>(null); // agrupadorId
  const [editTrabajo, setEditTrabajo] = useState<{ agrupadorId: string; trabajo: TrabajoBrief } | null>(null);

  useEffect(() => {
    if (id) fetchById(id);
  }, [id, fetchById]);

  const toggleExpanded = (aid: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(aid) ? next.delete(aid) : next.add(aid);
      return next;
    });

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
              {/* Header agrupador */}
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
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditAgrupador(agrupador)}
                  >
                    Editar
                  </button>
                </div>
              </div>

              {/* Trabajos */}
              {isOpen && (
                <div className="accordion-body">
                  {/* Cabecera trabajos */}
                  <div
                    className="flex items-center justify-between"
                    style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}
                  >
                    <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {t('entidades.trabajos')}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setNuevoTrabajo(agrupador.id)}
                    >
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
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/facturas?trabajo=${trabajo.id}`)}
                        >
                          Facturas
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/presupuestos?trabajo=${trabajo.id}`)}
                        >
                          Presupuestos
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

      {/* Modal editar cliente */}
      <ClienteModal
        open={editClienteOpen}
        onClose={() => setEditClienteOpen(false)}
        onSubmit={async data => { await update(c.id, data); setEditClienteOpen(false); }}
        titulo={`Editar ${t('entidades.cliente')}`}
        inicial={c}
      />

      {/* Modal nuevo agrupador */}
      <AgrupadorModal
        open={nuevoAgrupadorOpen}
        onClose={() => setNuevoAgrupadorOpen(false)}
        onSubmit={async data => { await createAgrupador(c.id, data); setNuevoAgrupadorOpen(false); }}
      />

      {/* Modal editar agrupador */}
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

      {/* Modal nuevo trabajo */}
      <TrabajoModal
        open={!!nuevoTrabajo}
        onClose={() => setNuevoTrabajo(null)}
        onSubmit={async data => {
          if (!nuevoTrabajo) return;
          await createTrabajo(c.id, nuevoTrabajo, data);
          setNuevoTrabajo(null);
        }}
      />

      {/* Modal editar trabajo */}
      <TrabajoModal
        open={!!editTrabajo}
        onClose={() => setEditTrabajo(null)}
        onSubmit={async data => {
          // El store no tiene updateTrabajo todavía — se añadirá cuando sea necesario
          setEditTrabajo(null);
        }}
        inicial={editTrabajo?.trabajo}
      />
    </div>
  );
}