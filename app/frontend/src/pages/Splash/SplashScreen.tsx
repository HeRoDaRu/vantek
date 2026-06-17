/**
 * ──────────────────────────────────────────────────────────────────────────────
 * SplashScreen.tsx — Boot splash that preloads the OCR engine
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Full-screen boot overlay shown before the app mounts. Calls
 *   preinicializarTesseract() to warm up the singleton Tesseract worker so the
 *   first albarán scan has no latency, then invokes onListo() to hand control to
 *   the app. Preload failure is non-blocking: it shows a warning and continues
 *   (the worker will be created on-demand at first scan).
 *
 * RELATIONSHIPS
 *   Imports:
 *     · @hooks/useTesseract → preinicializarTesseract() singleton warm-up
 *   Used by:
 *     · main.tsx — rendered before App until OCR preload settles
 *
 * PROPS
 *   · onListo: () => void → called when preload finishes (or fails non-blockingly)
 *
 * INPUTS / OUTPUTS
 *   Input:  none (runs preload on mount)
 *   Output: splash UI; calls onListo() to reveal the app
 *
 * NOTES
 *   · Not a routed page — it is mounted by main.tsx, not via App.tsx.
 *   · Cleanup guards against calling onListo after unmount (cancelado flag).
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';
import { preinicializarTesseract } from '@hooks/useTesseract';

interface SplashScreenProps {
  onListo: () => void;
}

export default function SplashScreen({ onListo }: SplashScreenProps) {
  const [fase, setFase]   = useState('Iniciando…');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;

    const iniciar = async () => {
      try {
        setFase('Cargando motor de reconocimiento OCR…');
        await preinicializarTesseract();
        if (!cancelado) {
          setFase('Listo');
          setTimeout(onListo, 200);
        }
      } catch (e: any) {
        if (!cancelado) {
          // Fallo no bloqueante: el hook creará el worker on-demand al usar el escáner
          console.warn('[Splash] Precarga Tesseract fallida:', e);
          setError('OCR no precargado — se iniciará al usar el escáner por primera vez');
          setTimeout(onListo, 1800);
        }
      }
    };

    iniciar();
    return () => { cancelado = true; };
  }, [onListo]);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 28, zIndex: 9999,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg viewBox="0 0 24 24" style={{ width: 24, height: 24 }}>
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="#fff" />
            <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Vantek
        </span>
      </div>

      {/* Indicador */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {/* Spinner animado */}
        <svg
          viewBox="0 0 24 24"
          style={{
            width: 24, height: 24,
            animation: 'spin 1s linear infinite',
            color: 'var(--accent)',
          }}
        >
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          <circle cx="12" cy="12" r="10" fill="none" stroke="var(--bg-3)" strokeWidth="3" />
          <path d="M12 2a10 10 0 010 20" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
        </svg>

        <span style={{
          fontSize: 12,
          color: error ? 'var(--orange)' : 'var(--text-3)',
          maxWidth: 280,
          textAlign: 'center',
          lineHeight: 1.5,
        }}>
          {error || fase}
        </span>
      </div>
    </div>
  );
}