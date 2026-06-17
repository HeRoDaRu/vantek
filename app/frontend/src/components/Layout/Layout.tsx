/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Layout.tsx — App shell (sidebar + content area)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   The outer chrome for all authenticated app routes: a mobile top bar with a
 *   hamburger that toggles the Sidebar, a backdrop for the mobile drawer, the
 *   Sidebar itself, and a <main> that renders the active route via <Outlet/>.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · react-router-dom (Outlet) → renders the matched child route
 *     · @components/Layout/Sidebar → navigation menu
 *   Used by:
 *     · App.tsx — element of the "/" parent route wrapping all pages
 *
 * PROPS
 *   · (none) — receives no props; owns local mobileOpen state
 *
 * INPUTS / OUTPUTS
 *   Input:  routed child pages (via <Outlet/>)
 *   Output: full-height flex shell; toggles Sidebar open/close on mobile
 *
 * NOTES
 *   · mobile-topbar / sidebar-backdrop are shown/hidden purely via CSS breakpoints.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@components/Layout/Sidebar';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Barra superior — solo visible en móvil/tablet vía CSS */}
      <header className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="mobile-topbar-brand">
          <span className="mobile-topbar-logo" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="white" strokeWidth="1.5" />
            </svg>
          </span>
          Vantek
        </span>
      </header>

      {/* Fondo oscuro al abrir el menú en móvil */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="app-main" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}