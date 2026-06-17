/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Toaster.tsx — Global toast notification container
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Subscribes to the toast store and renders the active toasts as a stacked
 *   live region. Each toast shows a type icon (error/success/info), its message,
 *   and a close button that dismisses it via the store.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @store/toast.store → toasts list + descartar(id) action
 *   Used by:
 *     · src/main.tsx (mounted once, alongside the app root)
 *
 * PROPS
 *   · (none) — reads all state from the toast store
 *
 * INPUTS / OUTPUTS
 *   Input:  toast entries pushed into the store from anywhere in the app
 *   Output: aria-live notification stack; close click calls descartar(id)
 *
 * NOTES
 *   · Renders nothing when there are no toasts.
 *   · role="region" + aria-live="polite" for accessible announcements.
 * ──────────────────────────────────────────────────────────────────────────────
 */

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
