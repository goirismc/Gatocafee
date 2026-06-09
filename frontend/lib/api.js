// lib/api.js
// Cliente HTTP centralizado con JWT automático
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Interceptor de REQUEST: adjunta token automáticamente ──
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gatocafee_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Interceptor de RESPONSE: maneja 401 globalmente ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gatocafee_token');
        localStorage.removeItem('gatocafee_usuario');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
