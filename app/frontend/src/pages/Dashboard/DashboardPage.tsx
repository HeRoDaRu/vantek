import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useDashboardStore, AgrupacionDashboard, PendienteAccion } from '@store/dashboard.store';
import Spinner from '@ui/Spinner';

function fmt(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
}

const TIPO_CONFIG: Record<PendienteAccion['tipo'], { label: string; clase: string }> = {
  factura_sin_cobrar: { label: 'Sin cobrar', clase: 'badge-borrador' },
  presupuesto_antiguo: { label: 'Llamar', clase: 'badge-pendiente_pago' },
  presupuesto_sin_convertir: { label: 'Sin respuesta', clase: 'badge-entregada' },
  factura_sin_entregar: { label: 'Sin entregar', clase: 'badge-cerrada' },
};

const AGRUPACIONES: { value: AgrupacionDashboard; label: string }[] = [
  { value: 'mes', label: 'Por mes' },
  { value: 'trimestre', label: 'Por trimestre' },
  { value: 'anio', label: 'Por año' },
];

function TooltipCustom({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-3)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <span>{p.name === 'pagado' ? 'Cobrado' : 'Proyección'}</span>
          <span style={{ fontWeight: 600 }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, cargando, error, agrupacion, cargar, setAgrupacion } = useDashboardStore();

  useEffect(() => { cargar(); }, []);

  if (cargando && !data) return <Spinner label="Cargando dashboard…" />;
  if (error) return (
    <div style={{ padding: 32, color: 'var(--red)' }}>
      Error cargando el dashboard: {error}
    </div>
  );

  const { pendientes = [], resumen, grafico_tipo } = data ?? {};

  // factura_sin_cobrar va primero, con badge rojo
  const pendientesOrdenados = [
    ...pendientes.filter(p => p.tipo === 'factura_sin_cobrar'),
    ...pendientes.filter(p => p.tipo !== 'factura_sin_cobrar'),
  ];

  const nSinConvertir = pendientes.filter(p => p.tipo === 'presupuesto_sin_convertir').length;
  const nAntiguos = pendientes.filter(p => p.tipo === 'presupuesto_antiguo').length;
  const nSinEntregar = pendientes.filter(p => p.tipo === 'factura_sin_entregar').length;
  const nSinCobrar = pendientes.filter(p => p.tipo === 'factura_sin_cobrar').length;

  function irAPendiente(p: PendienteAccion) {
    if (p.tipo === 'factura_sin_entregar' || p.tipo === 'factura_sin_cobrar') navigate(`/facturas/${p.id}`);
    else navigate(`/presupuestos/${p.id}`);
  }

  return (
    <div className="dashboard-page" style={{ padding: '24px 28px', maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Cabecera */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Resumen del estado actual del negocio</p>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <KpiCard
          label="Cobrado (real)"
          valor={resumen ? fmt(resumen.total_pagado) : '—'}
          sub="facturas pagadas · este año"
          acento="var(--green)"
        />
        <KpiCard
          label="Proyección"
          valor={resumen ? fmt(resumen.total_proyeccion) : '—'}
          sub="todas las facturas activas"
          acento="var(--accent)"
        />
        <KpiCard
          label="Pendientes"
          valor={String(pendientes.length)}
          sub={[
            nSinCobrar > 0 ? `${nSinCobrar} sin cobrar` : '',
            nSinEntregar > 0 ? `${nSinEntregar} sin entregar` : '',
            nAntiguos > 0 ? `${nAntiguos} antiguos` : '',
            nSinConvertir > 0 ? `${nSinConvertir} en espera` : '',
          ].filter(Boolean).join(' · ') || 'Todo en orden'}
          acento={nSinCobrar > 0 ? 'var(--red)' : pendientes.length > 0 ? 'var(--orange)' : 'var(--border-2)'}
        />
      </div>

      {/* Gráfico */}
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      }}>
        <div className="grafico-header" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Resumen económico</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
              Barras = cobrado real · Línea = proyección
            </div>
          </div>
          <div className="grafico-header-btns" style={{ display: 'flex', gap: 4 }}>
            {AGRUPACIONES.map(a => (
              <button
                key={a.value}
                className={`btn btn-sm ${agrupacion === a.value ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setAgrupacion(a.value)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {resumen && resumen.puntos.length > 0 ? (
          <div style={{ padding: '20px 20px 12px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={resumen.puntos} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
                <YAxis
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: 'var(--text-2)' }}
                />
                <Tooltip content={<TooltipCustom />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: 'var(--text-2)', paddingTop: 8 }}
                  formatter={(value) => value === 'pagado' ? 'Cobrado' : 'Proyección'}
                />
                {grafico_tipo === 'barras_lineas' ? (
                  <>
                    <Bar dataKey="pagado" name="pagado" fill="var(--green)" radius={[3, 3, 0, 0]} maxBarSize={48} />
                    <Line dataKey="proyeccion" name="proyeccion" type="monotone" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} />
                  </>
                ) : grafico_tipo === 'lineas' ? (
                  <>
                    <Line dataKey="pagado" name="pagado" type="monotone" stroke="var(--green)" strokeWidth={2} dot={{ fill: 'var(--green)', r: 3 }} />
                    <Line dataKey="proyeccion" name="proyeccion" type="monotone" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} />
                  </>
                ) : (
                  <>
                    <Bar dataKey="pagado" name="pagado" fill="var(--green)" radius={[3, 3, 0, 0]} maxBarSize={48} />
                    <Bar dataKey="proyeccion" name="proyeccion" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={48} />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Sin datos económicos</div>
            <div style={{ fontSize: 12 }}>Cuando empieces a cerrar facturas aparecerá el gráfico aquí</div>
          </div>
        )}
      </div>

      {/* Pendientes */}
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Pendientes de acción</span>
          {pendientes.length > 0 && (
            <span style={{
              marginLeft: 8, background: nSinCobrar > 0 ? 'var(--red)' : 'var(--orange)',
              color: '#fff', borderRadius: 99, fontSize: 11, padding: '1px 7px', fontWeight: 600,
            }}>
              {pendientes.length}
            </span>
          )}
        </div>

        {pendientesOrdenados.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Todo en orden</div>
            <div style={{ fontSize: 12 }}>No hay presupuestos ni facturas que requieran atención</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dash-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', width: 120 }}>Tipo</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>Cliente</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>Agrupador</th>
                  <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>Fecha</th>
                  <th style={{ textAlign: 'right', padding: '10px 20px', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {pendientesOrdenados.map((p, i) => {
                  const cfg = TIPO_CONFIG[p.tipo];
                  const esCritico = p.tipo === 'factura_sin_cobrar';
                  return (
                    <tr
                      key={`${p.tipo}-${p.id}-${i}`}
                      onClick={() => irAPendiente(p)}
                      style={{ cursor: 'pointer', transition: 'var(--transition)', background: esCritico ? 'rgba(239,68,68,0.04)' : undefined }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLTableRowElement).querySelectorAll('td').forEach(td => {
                          (td as HTMLElement).style.background = 'var(--bg-3)';
                        });
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLTableRowElement).querySelectorAll('td').forEach(td => {
                          (td as HTMLElement).style.background = esCritico ? 'rgba(239,68,68,0.04)' : '';
                        });
                      }}
                    >
                      <td style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                        <span className={`badge ${cfg.clase}`} style={{ fontSize: 10 }}>{cfg.label}</span>
                      </td>
                      <td style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                        {p.cliente}
                      </td>
                      <td style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-2)' }}>
                        {p.agrupador}
                      </td>
                      <td style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-2)' }}>
                        {fmtFecha(p.fecha)}
                        {p.dias_espera !== undefined && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: p.dias_espera >= 30 ? 'var(--orange)' : 'var(--text-3)' }}>
                            ({p.dias_espera}d)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 600, textAlign: 'right', color: esCritico ? 'var(--red)' : 'var(--text)' }}>
                        {fmt(p.importe)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

function KpiCard({ label, valor, sub, acento }: {
  label: string; valor: string; sub: string; acento: string;
}) {
  return (
    <div className="kpi-card" style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '18px 20px',
      borderTop: `2px solid ${acento}`, position: 'relative', overflow: 'hidden',
    }}>
      <div className="kpi-label" style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {label}
      </div>
      <div className="kpi-value" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 4 }}>
        {valor}
      </div>
      <div className="kpi-sub" style={{ fontSize: 11, color: 'var(--text-3)' }}>
        {sub}
      </div>
    </div>
  );
}