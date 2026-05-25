import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useDashboardStore, AgrupacionDashboard, PendienteAccion } from '../../store/dashboard.store';
import Spinner from '../../components/UI/Spinner';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ─── tarjeta de KPI ──────────────────────────────────────────────────────────

function KpiCard({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
        {valor}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── fila de pendiente ───────────────────────────────────────────────────────

const TIPO_CONFIG: Record<PendienteAccion['tipo'], { label: string; color: string; pill: string }> = {
  presupuesto_antiguo:     { label: 'Llamar',        color: 'var(--orange)', pill: 'badge-pendiente_pago' },
  presupuesto_sin_convertir: { label: 'Sin respuesta', color: 'var(--blue)',   pill: 'badge-entregada' },
  factura_sin_entregar:    { label: 'Sin entregar',  color: 'var(--red)',    pill: 'badge-borrador' },
};

function FilaPendiente({ p, onClick }: { p: PendienteAccion; onClick: () => void }) {
  const cfg = TIPO_CONFIG[p.tipo];
  return (
    <tr
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      className="table-row-hover"
    >
      <td>
        <span className={`badge ${cfg.pill}`} style={{ fontSize: 10 }}>{cfg.label}</span>
      </td>
      <td style={{ fontWeight: 500 }}>{p.cliente}</td>
      <td style={{ color: 'var(--text-2)' }}>{p.agrupador}</td>
      <td style={{ color: 'var(--text-2)', fontSize: 12 }}>
        {fmtFecha(p.fecha)}
        {p.dias_espera !== undefined && (
          <span style={{ marginLeft: 6, color: p.dias_espera >= 30 ? 'var(--orange)' : 'var(--text-3)' }}>
            ({p.dias_espera}d)
          </span>
        )}
      </td>
      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(p.importe)}</td>
    </tr>
  );
}

// ─── tooltip del gráfico ─────────────────────────────────────────────────────

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
          <span>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── página principal ─────────────────────────────────────────────────────────

const AGRUPACIONES: { value: AgrupacionDashboard; label: string }[] = [
  { value: 'mes',       label: 'Por mes' },
  { value: 'trimestre', label: 'Por trimestre' },
  { value: 'anio',      label: 'Por año' },
];

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

  // Navegar al documento desde pendiente
  function irAPendiente(p: PendienteAccion) {
    if (p.tipo === 'factura_sin_entregar') navigate(`/facturas/${p.id}`);
    else navigate(`/presupuestos/${p.id}`);
  }

  // Separar pendientes por tipo para el resumen de cabecera
  const nSinConvertir = pendientes.filter(p => p.tipo === 'presupuesto_sin_convertir').length;
  const nAntiguos     = pendientes.filter(p => p.tipo === 'presupuesto_antiguo').length;
  const nSinEntregar  = pendientes.filter(p => p.tipo === 'factura_sin_entregar').length;

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1100 }}>

      {/* ── cabecera ─────────────────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Resumen del estado actual del negocio</p>
      </div>

      {/* ── KPIs rápidos ─────────────────────────────────────────────────── */}
      {resumen && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <KpiCard
            label="Cobrado (real)"
            valor={fmt(resumen.total_pagado)}
            sub={`facturas pagadas · ${agrupacion === 'mes' ? 'este año' : agrupacion === 'trimestre' ? 'este año' : 'histórico'}`}
          />
          <KpiCard
            label="Proyección"
            valor={fmt(resumen.total_proyeccion)}
            sub="todas las facturas activas"
          />
          <KpiCard
            label="Pendientes"
            valor={String(pendientes.length)}
            sub={`${nSinEntregar} sin entregar · ${nAntiguos} antiguos · ${nSinConvertir} en espera`}
          />
        </div>
      )}

      {/* ── gráfico económico ─────────────────────────────────────────────── */}
      {resumen && resumen.puntos.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Resumen económico</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
                Barras = cobrado real · Línea = proyección
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {AGRUPACIONES.map(a => (
                <button
                  key={a.value}
                  className={`btn ${agrupacion === a.value ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => setAgrupacion(a.value)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            {grafico_tipo === 'barras_lineas' ? (
              <ComposedChart data={resumen.puntos} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
                <YAxis
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: 'var(--text-2)' }}
                />
                <Tooltip content={<TooltipCustom />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: 'var(--text-2)' }}
                  formatter={(value) => value === 'pagado' ? 'Cobrado' : 'Proyección'}
                />
                <Bar dataKey="pagado" name="pagado" fill="var(--green)" radius={[3, 3, 0, 0]} maxBarSize={48} />
                <Line
                  dataKey="proyeccion" name="proyeccion"
                  type="monotone" stroke="var(--accent)"
                  strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }}
                />
              </ComposedChart>
            ) : (
              /* fallback: solo barras si el tipo no es barras_lineas */
              <ComposedChart data={resumen.puntos} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
                <YAxis
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: 'var(--text-2)' }}
                />
                <Tooltip content={<TooltipCustom />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-2)' }} />
                <Bar dataKey="pagado" name="Cobrado" fill="var(--green)" radius={[3, 3, 0, 0]} maxBarSize={48} />
                <Bar dataKey="proyeccion" name="Proyección" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={48} />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {resumen && resumen.puntos.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-2)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin datos económicos</div>
          <div style={{ fontSize: 13 }}>Cuando empieces a cerrar facturas aparecerá el gráfico aquí</div>
        </div>
      )}

      {/* ── pendientes de acción ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Pendientes de acción</span>
            {pendientes.length > 0 && (
              <span style={{
                marginLeft: 8, background: 'var(--red)', color: '#fff',
                borderRadius: 10, fontSize: 11, padding: '1px 7px', fontWeight: 600,
              }}>{pendientes.length}</span>
            )}
          </div>
        </div>

        {pendientes.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-2)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Todo en orden</div>
            <div style={{ fontSize: 13 }}>No hay presupuestos ni facturas que requieran atención</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Tipo</th>
                  <th>Cliente</th>
                  <th>Obra / Agrupador</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: 'right' }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((p, i) => (
                  <FilaPendiente
                    key={`${p.tipo}-${p.id}-${i}`}
                    p={p}
                    onClick={() => irAPendiente(p)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}