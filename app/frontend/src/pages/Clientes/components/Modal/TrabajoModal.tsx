/**
 * ──────────────────────────────────────────────────────────────────────────────
 * TrabajoModal.tsx — Create/edit trabajo (obra) form modal
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Controlled modal form for a trabajo (nombre required; descripcion optional;
 *   margen_porcentaje seeded from the global default margen_defecto). Labels are
 *   profile-aware via t('entidades.trabajo'). Validates the name and a
 *   non-negative numeric margin, then delegates persistence via onSubmit.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @ui/Modal → modal shell with footer actions
 *     · @store/config.store → t() + appConfig.documentos.margen_defecto
 *     · @store/clientes.store (TrabajoBrief type) → shape of `inicial`
 *   Used by:
 *     · ClienteFichaPage (create/edit trabajo)
 *
 * PROPS
 *   · open: boolean → whether the modal is visible
 *   · onClose: () => void → close handler
 *   · onSubmit: (data) => Promise<void> → persist { nombre, descripcion?, margen_porcentaje? }
 *   · inicial?: Partial<TrabajoBrief & { descripcion?; margen_porcentaje? }> → seed values when editing
 *
 * INPUTS / OUTPUTS
 *   Input:  user-typed nombre/descripcion/margen; open/inicial props
 *   Output: calls onSubmit with cleaned data; surfaces validation/save errors
 *
 * NOTES
 *   · margen_porcentaje defaults to the global config margen_defecto for new trabajos.
 *   · The margin is internal and never appears on client-facing PDFs.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import Modal from '@ui/Modal';
import { useConfigStore } from '@store/config.store';
import { TrabajoBrief } from '@store/clientes.store';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { nombre: string; descripcion?: string; margen_porcentaje?: number }) => Promise<void>;
  inicial?: Partial<TrabajoBrief & { descripcion?: string; margen_porcentaje?: number }>;
}

export default function TrabajoModal({ open, onClose, onSubmit, inicial }: Props) {
  const { t, appConfig } = useConfigStore();
  const margenDefecto = appConfig?.documentos.margen_defecto ?? 0;

  const [form, setForm] = useState({ nombre: '', descripcion: '', margen_porcentaje: String(margenDefecto) });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        nombre:            inicial?.nombre ?? '',
        descripcion:       inicial?.descripcion ?? '',
        margen_porcentaje: String(inicial?.margen_porcentaje ?? margenDefecto),
      });
      setErr('');
    }
  }, [open, inicial, margenDefecto]);

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { setErr(`El nombre del ${t('entidades.trabajo').toLowerCase()} es obligatorio`); return; }
    const margen = parseFloat(form.margen_porcentaje);
    if (isNaN(margen) || margen < 0) { setErr('El margen debe ser un número positivo'); return; }
    setSaving(true);
    setErr('');
    try {
      await onSubmit({
        nombre:            form.nombre.trim(),
        descripcion:       form.descripcion.trim() || undefined,
        margen_porcentaje: margen,
      });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const titulo = inicial?.id
    ? `Editar ${t('entidades.trabajo')}`
    : `Nuevo ${t('entidades.trabajo')}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      size="sm"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">{t('entidades.trabajo')} *</label>
          <input
            className="input"
            placeholder={`Nombre del ${t('entidades.trabajo').toLowerCase()}`}
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea
            className="textarea"
            value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Margen (%)
            <span className="text-muted" style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              — por defecto {margenDefecto}%
            </span>
          </label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.1"
            value={form.margen_porcentaje}
            onChange={e => setForm(f => ({ ...f, margen_porcentaje: e.target.value }))}
          />
        </div>
        {err && <span className="form-error">{err}</span>}
      </div>
    </Modal>
  );
}