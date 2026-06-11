import { useEffect, useRef, useState } from 'react';
import { createWorker, Worker } from 'tesseract.js';

// ─── Singleton del worker ─────────────────────────────────────────────────────
// Se crea una única instancia compartida por toda la app

let workerSingleton: Worker | null = null;
let workerPromise: Promise<Worker> | null = null;

export async function preinicializarTesseract(): Promise<void> {
  if (workerSingleton || workerPromise) return;
  workerPromise = createWorker('spa', 1, {
    workerPath: '/tesseract-worker/worker.min.js',
    langPath: '/tessdata',
    corePath: '/tesseract-worker/tesseract-core.wasm.js',
    logger: () => {}, // silenciar logs en producción
  });
  workerSingleton = await workerPromise;
}

export function getTesseractWorker(): Worker | null {
  return workerSingleton;
}

// ─── Hook para usar OCR en un componente ──────────────────────────────────────

export interface OcrResultado {
  texto: string;
  confianza: number; // 0-100
}

export interface OcrEstado {
  procesando: boolean;
  progreso: number; // 0-1
  error: string | null;
}

export function useTesseract() {
  const [estado, setEstado] = useState<OcrEstado>({ procesando: false, progreso: 0, error: null });
  const abortRef = useRef(false);

  useEffect(() => {
    return () => { abortRef.current = true; };
  }, []);

  async function reconocer(imagen: File | Blob): Promise<OcrResultado | null> {
    setEstado({ procesando: true, progreso: 0, error: null });
    abortRef.current = false;

    try {
      let worker = workerSingleton;

      // Si el worker todavía no está listo, esperar
      if (!worker && workerPromise) {
        worker = await workerPromise;
      }

      // Fallback: crear worker on-demand si el splash no lo precargó
      if (!worker) {
        setEstado(s => ({ ...s, progreso: 0.1 }));
        workerPromise = createWorker('spa', 1, {
          workerPath: '/tesseract-worker/worker.min.js',
          langPath: '/tessdata',
          corePath: '/tesseract-worker/tesseract-core.wasm.js',
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              setEstado(s => ({ ...s, progreso: 0.3 + m.progress * 0.7 }));
            }
          },
        });
        worker = await workerPromise;
        workerSingleton = worker;
      }

      if (abortRef.current) return null;
      setEstado(s => ({ ...s, progreso: 0.3 }));

      const { data } = await worker.recognize(imagen);

      if (abortRef.current) return null;
      setEstado({ procesando: false, progreso: 1, error: null });

      return { texto: data.text, confianza: data.confidence };
    } catch (e: any) {
      if (!abortRef.current) {
        setEstado({ procesando: false, progreso: 0, error: e.message ?? 'Error en OCR' });
      }
      return null;
    }
  }

  function resetear() {
    abortRef.current = true;
    setEstado({ procesando: false, progreso: 0, error: null });
  }

  return { estado, reconocer, resetear };
}