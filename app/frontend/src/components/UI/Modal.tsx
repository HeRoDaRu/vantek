/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Modal.tsx — Generic overlay dialog with animated open/close
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Renders a centered dialog over a dimmed overlay with a title, body and
 *   optional footer. Closes on Escape, on overlay-background click, or via the
 *   header close button, playing a brief exit animation before unmounting.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · react (useEffect/useState/useCallback) → escape handling + close animation
 *   Used by:
 *     · Most feature modals (e.g. SelectorTrabajoModal and page-level dialogs)
 *
 * PROPS
 *   · open?: boolean → visibility (default true); when false renders nothing
 *   · onClose: () => void → invoked after the close animation completes
 *   · title: string → header text
 *   · size?: 'sm' | 'md' | 'lg' → width preset (default 'md')
 *   · children: ReactNode → modal body content
 *   · footer?: ReactNode → optional footer (actions)
 *
 * INPUTS / OUTPUTS
 *   Input:  open/title/size/children/footer props
 *   Output: overlay + dialog; calls onClose after CLOSE_MS exit animation
 *
 * NOTES
 *   · CLOSE_MS (125ms) must match the CSS exit animation duration.
 *   · Escape and background clicks route through requestClose (animated).
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useCallback, ReactNode } from 'react';

interface ModalProps {
  open?: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  footer?: ReactNode;
}

// Duración de la animación de salida (estándar de cierre rápido).
const CLOSE_MS = 125;

export default function Modal({ open = true, onClose, title, size = 'md', children, footer }: ModalProps) {
  const [closing, setClosing] = useState(false);

  // Cierre con animación: reproduce la salida y luego desmonta.
  const requestClose = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, CLOSE_MS);
  }, [onClose]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, requestClose]);

  if (!open) return null;

  return (
    <div
      className={`modal-overlay${closing ? ' modal-overlay-closing' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) requestClose(); }}
    >
      <div className={`modal modal-${size}${closing ? ' modal-closing' : ''}`}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-icon btn-ghost btn-sm" onClick={requestClose} aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}