import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useConfigStore } from '@store/config.store';

// ─── iconos SVG inline ────────────────────────────────────────────────────────

const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);
const IconClientes = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IconFacturas = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const IconPresupuestos = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);
const IconAlbaranes = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);
const IconSeguimiento = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const IconConfig = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
  </svg>
);
const IconCollapse = ({ collapsed }: { collapsed: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

// ─── item de menú ─────────────────────────────────────────────────────────────

function NavItem({
  to, icon, label, collapsed,
}: {
  to: string; icon: React.ReactNode; label: string; collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `nav-item${collapsed ? ' collapsed' : ''}${isActive ? ' active' : ''}`
      }
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

// ─── sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile } = useConfigStore();
  const modulos = profile?.modulos ?? {} as { albaranes?: boolean; seguimiento?: boolean };

  const W = collapsed ? 56 : 210;

  return (
    <aside style={{
      width: W, flexShrink: 0,
      background: 'var(--bg-2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 200ms ease',
      overflow: 'hidden',
    }}>

      {/* logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? '18px 0' : '21px 14px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="white" strokeWidth="1.5" />
          </svg>
        </div>
        {!collapsed && <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>Vantek</span>}
      </div>

      {/* nav */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        <NavItem to="/dashboard" icon={<IconDashboard />} label="Dashboard" collapsed={collapsed} />
        <NavItem to="/clientes" icon={<IconClientes />} label="Clientes" collapsed={collapsed} />
        <NavItem to="/presupuestos" icon={<IconPresupuestos />} label="Presupuestos" collapsed={collapsed} />
        <NavItem to="/facturas" icon={<IconFacturas />} label="Facturas" collapsed={collapsed} />
        {modulos.albaranes && (
          <NavItem to="/albaranes" icon={<IconAlbaranes />} label="Albaranes" collapsed={collapsed} />
        )}
        {modulos.seguimiento && (
          <NavItem to="/seguimiento" icon={<IconSeguimiento />} label="Trabajos" collapsed={collapsed} />
        )}
      </nav>

      {/* configuración + colapsar */}
      <div style={{ padding: '8px 8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavItem to="/configuracion" icon={<IconConfig />} label="Configuración" collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="sidebar-collapse-btn"
          style={{ justifyContent: collapsed ? 'center' : 'flex-end' }}
        >
          <IconCollapse collapsed={collapsed} />
        </button>
      </div>
    </aside>
  );
}