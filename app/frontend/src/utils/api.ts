/**
 * ──────────────────────────────────────────────────────────────────────────────
 * api.ts — Shared axios instance for all backend REST calls
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Creates and exports the single axios instance used across the frontend.
 *   Configured with baseURL '/api' (nginx/dev proxy forwards to the backend),
 *   a JSON content-type and a 15s timeout. A response interceptor surfaces a
 *   user-friendly error toast and normalises rejections into Error(message).
 *
 * RELATIONSHIPS
 *   Imports:
 *     · axios → HTTP client
 *     · @store/toast.store (notificarError) → global error notifications
 *   Used by:
 *     · Every Zustand store and page that talks to the backend
 *
 * EXPORTS
 *   · default (api) → preconfigured axios instance (baseURL '/api')
 *
 * INPUTS / OUTPUTS
 *   Input:  axios requests from stores/components
 *   Output: axios responses; rejected promises become Error(message)
 *
 * NOTES
 *   · baseURL is relative ('/api') for both Windows and Docker deployments — no
 *     hardcoded host/port.
 *   · Cancelled requests (axios.isCancel) do NOT trigger an error toast.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';
import { notificarError } from '@store/toast.store';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Error de conexión';
    // Si la petición no fue cancelada, notificar al usuario globalmente.
    if (!axios.isCancel(err)) {
      notificarError(message);
    }
    return Promise.reject(new Error(message));
  }
);

export default api;