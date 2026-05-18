import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useConfigStore } from '../../store/config.store';

// Iconos inline minimalistas (sin dependencia externa)
const icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  ),
  clientes: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="5" r="3" />
      <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" />
    </svg>
  ),
  facturas: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="1" width="10" height="14" rx="1" />
      <path d="M6 5h4M6 8h4M6 11h2" />
    </svg>
  ),
  presupuestos: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="1" width="10" height="14" rx="1" />
      <path d="M6 5h4M6 8h2" />
      <circle cx="11" cy="11" r="2" />
      <path d="M13 13l1.5 1.5" />
    </svg>
  ),
  albaranes: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 2h12v3l-2 2 2 2v5H2V9l2-2-2-2V2z" />
    </svg>
  ),
  seguimiento: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4v4l3 2" />
    </svg>
  ),
  config: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
    </svg>
  ),
  chevron: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 3l4 4-4 4" />
    </svg>
  ),
  menu: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  ),
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { t, profile } = useConfigStore();
  const location = useLocation();

  const modulos = profile?.modulos;

  const navItems = [
    { to: '/dashboard',    label: t('menu.dashboard'),    icon: icons.dashboard,    always: true },
    { to: '/clientes',     label: t('menu.clientes'),     icon: icons.clientes,     always: true },
    { to: '/facturas',     label: t('menu.facturas'),     icon: icons.facturas,     always: true },
    { to: '/presupuestos', label: t('menu.presupuestos'), icon: icons.presupuestos, always: true },
    { to: '/albaranes',    label: t('menu.albaranes'),    icon: icons.albaranes,    always: false, flag: modulos?.albaranes },
    { to: '/seguimiento',  label: t('menu.seguimiento'),  icon: icons.seguimiento,  always: false, flag: modulos?.seguimiento },
    { to: '/config',       label: t('menu.configuracion'), icon: icons.config,      always: true },
  ];

  const visible = navItems.filter(item => item.always || item.flag);

  return (
    <aside
      className="sidebar"
      style={{
        width: collapsed ? 'var(--sidebar-col)' : 'var(--sidebar-w)',
        transition: 'width var(--transition)',
        background: 'var(--bg-2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: '14px 14px',
          borderBottom: '1px solid var(--border)',
          minHeight: 52,
        }}
      >
        {!collapsed && (
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Vantek
          </span>
        )}
        <button
          className="btn btn-icon btn-ghost btn-sm"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {icons.menu}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visible.map(item => {
          const active = location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '8px 0' : '8px 10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500,
                color: active ? 'var(--text)' : 'var(--text-2)',
                background: active ? 'var(--bg-4)' : 'transparent',
                transition: 'var(--transition)',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)';
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span style={{ flexShrink: 0, color: active ? 'var(--accent)' : 'var(--text-3)' }}>
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}