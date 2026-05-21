import { useState, useEffect } from 'react';
import Modal from '../../../components/UI/Modal';
import { useConfigStore } from '../../../store/config.store';
import { Agrupador } from '../../../store/clientes.store';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { label: string; descripcion?: string }) => Promise<void>;
  inicial?: Partial<Agrupador>;
}

export default function AgrupadorModal({ open, onClose, onSubmit, inicial }: Props) {
  const { t } = useConfigStore();
  const [form, setForm] = useState({ label: '', descripcion: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ label: inicial?.label ?? '', descripcion: inicial?.descripcion ?? '' });
      setErr('');
    }
  }, [open, inicial]);

  const handleSubmit = async () => {
    if (!form.label.trim()) { setErr(`El nombre de la ${t('entidades.agrupador').toLowerCase()} es obligatorio`); return; }
    setSaving(true);
    setErr('');
    try {
      await onSubmit({ label: form.label.trim(), descripcion: form.descripcion.trim() || undefined });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const titulo = inicial?.id
    ? `Editar ${t('entidades.agrupador')}`
    : `Nueva ${t('entidades.agrupador')}`;

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
          <label className="form-label">{t('entidades.agrupador')} *</label>
          <input
            className="input"
            placeholder={`Nombre de la ${t('entidades.agrupador').toLowerCase()}`}
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
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
        {err && <span className="form-error">{err}</span>}
      </div>
    </Modal>
  );
}