import { useState, useEffect } from 'react';
import Modal from '@ui/Modal';
import { Cliente } from '@store/clientes.store';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Cliente>) => Promise<void>;
  titulo: string;
  inicial?: Partial<Cliente>;
}

export default function ClienteModal({ open, onClose, onSubmit, titulo, inicial }: Props) {
  const [form, setForm] = useState({ nombre: '', empresa: '', dni_cif: '', telefono: '', email: '', notas: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        nombre:   inicial?.nombre   ?? '',
        empresa:  inicial?.empresa  ?? '',
        dni_cif:  inicial?.dni_cif  ?? '',
        telefono: inicial?.telefono ?? '',
        email:    inicial?.email    ?? '',
        notas:    inicial?.notas    ?? '',
      });
      setErr('');
    }
  }, [open, inicial]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { setErr('El nombre es obligatorio'); return; }
    setSaving(true);
    setErr('');
    try {
      await onSubmit({
        nombre:   form.nombre.trim(),
        empresa:  form.empresa.trim()  || undefined,
        dni_cif:  form.dni_cif.trim()  || undefined,
        telefono: form.telefono.trim() || undefined,
        email:    form.email.trim()    || undefined,
        notas:    form.notas.trim()    || undefined,
      });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      size="md"
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
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input className="input" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Empresa</label>
            <input className="input" value={form.empresa} onChange={e => set('empresa', e.target.value)} />
          </div>
        </div>
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label">DNI / CIF</label>
            <input className="input" value={form.dni_cif} onChange={e => set('dni_cif', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <input className="input" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Notas</label>
          <textarea className="textarea" value={form.notas} onChange={e => set('notas', e.target.value)} />
        </div>
        {err && <span className="form-error">{err}</span>}
      </div>
    </Modal>
  );
}