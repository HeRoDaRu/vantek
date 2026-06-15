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