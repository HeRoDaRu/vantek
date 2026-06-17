/**
 * ──────────────────────────────────────────────────────────────────────────────
 * ClientesPage.tsx — Client list with search and quick creation
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Lists all active clients in a table with a debounced search box (300ms).
 *   Lets the user create a new client via ClienteModal and, on success,
 *   navigates straight to the new client's ficha page. Labels are profile-aware
 *   (t('entidades.cliente')) so the page works for reformas, taller, etc.
 *
 * ROUTE
 *   /clientes
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @store/clientes.store → fetchAll/create + clientes/loading/error state
 *     · @store/config.store → t() for profile terminology
 *     · @ui/Spinner → loading indicator
 *     · @pages/Clientes/components/Modal/ClienteModal → create-client form
 *   Backend (via store):
 *     · GET /api/clientes?search= → load/filter list
 *     · POST /api/clientes → create client
 *   Used by:
 *     · Route /clientes in App.tsx (inside Layout)
 *
 * INPUTS / OUTPUTS
 *   Input:  search text, "Nuevo cliente" click, row click
 *   Output: rendered client table; navigation to /clientes/:id on create or row click
 *
 * NOTES
 *   · Dirección column is derived from agrupadores[].label joined by commas
 *     (the clientes table has no direccion field).
 *   · Borrado lógico: only active clients appear here.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClientesStore } from "@store/clientes.store";
import { useConfigStore } from "@store/config.store";
import Spinner from "@ui/Spinner";
// import Modal from "@components/UI/Modal"
import ClienteModal from "@pages/Clientes/components/Modal/ClienteModal";

export default function ClientesPage() {
  const { clientes, loading, error, fetchAll, create } = useClientesStore();
  const { t } = useConfigStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Carga inicial y búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAll(search || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchAll]);

  const handleCrear = async (data: {
    nombre: string;
    empresa?: string;
    dni_cif?: string;
    telefono?: string;
    email?: string;
    notas?: string;
  }) => {
    const nuevo = await create(data);
    setModalOpen(false);
    navigate(`/clientes/${nuevo.id}`);
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">{t("entidades.clientes")}</h1>
        <div className="flex items-center gap-2">
          <div className="search-wrap">
            <span className="search-icon">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="6" cy="6" r="4" />
                <path d="M9.5 9.5L13 13" />
              </svg>
            </span>
            <input
              className="input search-input"
              style={{ width: 240 }}
              placeholder={`Buscar ${t("entidades.clientes").toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setModalOpen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo {t("entidades.cliente")}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="page-body-flush">
        {loading && (
          <Spinner
            label={`Cargando ${t("entidades.clientes").toLowerCase()}…`}
          />
        )}

        {error && (
          <div className="empty">
            <span style={{ color: "var(--red)" }}>{error}</span>
          </div>
        )}

        {!loading && !error && clientes.length === 0 && (
          <div className="empty">
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <circle cx="20" cy="14" r="7" />
              <path d="M5 38c0-8.284 6.716-15 15-15s15 6.716 15 15" />
            </svg>
            <span className="empty-title">
              {search
                ? `Sin resultados para "${search}"`
                : `No hay ${t("entidades.clientes").toLowerCase()} todavía`}
            </span>
            {!search && (
              <span className="empty-desc">
                Crea el primer {t("entidades.cliente").toLowerCase()} para
                empezar.
              </span>
            )}
          </div>
        )}

        {!loading && !error && clientes.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("entidades.cliente")}</th>
                  <th>Empresa</th>
                  <th>Dirección</th>
                  <th>DNI / CIF</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/clientes/${c.id}`)}>
                    <td>
                      <span
                        className="font-medium"
                        style={{ color: "var(--text)" }}
                      >
                        {c.nombre}
                      </span>
                    </td>
                    <td>
                      {c.empresa ?? <span className="text-muted">—</span>}
                    </td>
                    <td className="mono">
                      {c.agrupadores?.map(a => a.label).join(', ') ?? <span className="text-muted">—</span>}
                    </td>
                    <td className="mono">
                      {c.dni_cif ?? <span className="text-muted">—</span>}
                    </td>
                    <td>
                      {c.telefono ?? <span className="text-muted">—</span>}
                    </td>
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
        titulo={`Nuevo ${t("entidades.cliente")}`}
      />
    </div>
  );
}
