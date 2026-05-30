import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientesStore } from '@store/clientes.store';
import { useConfigStore } from '@store/config.store';
import Spinner from '@ui/Spinner';
// import Modal from "@components/UI/Modal"
import ClienteModal from '@pages/Clientes/components/Modal/ClienteModal';

export default function ClientesPage() {
  const { clientes, loading, error, fetchAll, create } = useClientesStore();
  const { t } = useConfigStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Carga inicial y búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAll(search || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchAll]);

  const handleCrear = async (data: { nombre: string; empresa?: string; dni_cif?: string; telefono?: string; email?: string; notas?: string }) => {
    const nuevo = await create(data);
    setModalOpen(false);
    navigate(`/clientes/${nuevo.id}`);
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">{t('entidades.clientes')}</h1>
        <div className="flex items-center gap-2">
          <div className="search-wrap">
            <span className="search-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="6" cy="6" r="4" />
                <path d="M9.5 9.5L13 13" />
              </svg>
            </span>
            <input
              className="input search-input"
              style={{ width: 240 }}
              placeholder={`Buscar ${t('entidades.clientes').toLowerCase()}…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            + Nuevo {t('entidades.cliente')}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="page-body-flush">
        {loading && <Spinner label={`Cargando ${t('entidades.clientes').toLowerCase()}…`} />}

        {error && (
          <div className="empty">
            <span style={{ color: 'var(--red)' }}>{error}</span>
          </div>
        )}

        {!loading && !error && clientes.length === 0 && (
          <div className="empty">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2">
              <circle cx="20" cy="14" r="7" />
              <path d="M5 38c0-8.284 6.716-15 15-15s15 6.716 15 15" />
            </svg>
            <span className="empty-title">
              {search ? `Sin resultados para "${search}"` : `No hay ${t('entidades.clientes').toLowerCase()} todavía`}
            </span>
            {!search && (
              <span className="empty-desc">
                Crea el primer {t('entidades.cliente').toLowerCase()} para empezar.
              </span>
            )}
          </div>
        )}

        {!loading && !error && clientes.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('entidades.cliente')}</th>
                  <th>Empresa</th>
                  <th>DNI / CIF</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id} onClick={() => navigate(`/clientes/${c.id}`)}>
                    <td>
                      <span className="font-medium" style={{ color: 'var(--text)' }}>{c.nombre}</span>
                    </td>
                    <td>{c.empresa ?? <span className="text-muted">—</span>}</td>
                    <td className="mono">{c.dni_cif ?? <span className="text-muted">—</span>}</td>
                    <td>{c.telefono ?? <span className="text-muted">—</span>}</td>
                    <td>{c.email ?? <span className="text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear cliente */}
      <ClienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCrear}
        titulo={`Nuevo ${t('entidades.cliente')}`}
      />
    </div>
  );
}