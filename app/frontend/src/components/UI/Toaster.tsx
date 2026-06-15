import { useToastStore } from '@store/toast.store';

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const descartar = useToastStore((s) => s.descartar);

  if (toasts.length === 0) return null;

  return (
    <div className="toaster" role="region" aria-live="polite" aria-label="Notificaciones">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tipo}`} role="alert">
          <span className="toast-icon" aria-hidden="true">
            {t.tipo === 'error' ? '!' : t.tipo === 'success' ? '\u2713' : 'i'}
          </span>
          <span className="toast-msg">{t.mensaje}</span>
          <button
            className="toast-close"
            onClick={() => descartar(t.id)}
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
