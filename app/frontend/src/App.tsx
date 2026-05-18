import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useConfigStore } from './store/config.store';
import Layout from './components/Layout/Layout';
import ClientesPage from './pages/Clientes/ClientesPage';
import ClienteFichaPage from './pages/Clientes/ClienteFichaPage';
import AlbaranesPage from './pages/Albaranes/AlbaranesPage';
import AlbaranFichaPage from './pages/Albaranes/AlbaranFichaPage';

export default function App() {
  const { load, loaded, error } = useConfigStore();

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) {
    return (
      <div className="loading-page">
        <div className="spinner spinner-lg" />
        <span>Cargando configuración…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-page">
        <span style={{ color: 'var(--red)' }}>Error al cargar la configuración: {error}</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/clientes" replace />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="clientes/:id" element={<ClienteFichaPage />} />
          <Route path="albaranes" element={<AlbaranesPage />} />
          <Route path="albaranes/:id" element={<AlbaranFichaPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}