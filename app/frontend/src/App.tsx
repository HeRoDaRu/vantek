import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useConfigStore } from '@store/config.store';
import Layout from '@components/Layout/Layout';
import ClientesPage from '@pages/Clientes/ClientesPage';
import ClienteFichaPage from '@pages/Clientes/ClienteFichaPage';
import AlbaranesPage from '@pages/Albaranes/AlbaranesPage';
import AlbaranFichaPage from '@pages/Albaranes/AlbaranFichaPage';
import SetupPage from '@pages/Setup/SetupPage';
import FacturasListPage from '@pages/Documentos/FacturasListPage';
import PresupuestosListPage from '@pages/Documentos/PresupuestosListPage';
import FacturaPage from '@pages/Documentos/FacturaPage';
import PresupuestoPage from '@pages/Documentos/PresupuestoPage';
import DashboardPage from '@pages/Dashboard/DashboardPage';
import ConfigPage from '@pages/Config/ConfigPage';
import Spinner from '@ui/Spinner';

export default function App() {
  const { load } = useConfigStore();
  const [configState, setConfigState] = useState<'loading' | 'setup' | 'ready' | 'error'>('loading');

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/setup/status');
        const data = await res.json();
        if (data.necesita_setup) {
          setConfigState('setup');
          return;
        }
        await load();
        setConfigState('ready');
      } catch {
        setConfigState('error');
      }
    }
    init();
  }, [load]);

  if (configState === 'loading') {
    return (
      <div className="loading-page">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (configState === 'error') {
    return (
      <div className="loading-page" style={{ flexDirection: 'column', gap: 8 }}>
        <span style={{ color: 'var(--red)' }}>No se pudo conectar con el servidor</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          Asegúrate de que el servicio está en ejecución
        </span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {configState === 'setup' ? (
          <>
            <Route path="*" element={<SetupPage />} />
          </>
        ) : (
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="clientes/:id" element={<ClienteFichaPage />} />
            <Route path="albaranes" element={<AlbaranesPage />} />
            <Route path="albaranes/:id" element={<AlbaranFichaPage />} />
            <Route path="facturas" element={<FacturasListPage />} />
            <Route path="facturas/:id" element={<FacturaPage />} />
            <Route path="presupuestos" element={<PresupuestosListPage />} />
            <Route path="presupuestos/:id" element={<PresupuestoPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="configuracion" element={<ConfigPage />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}