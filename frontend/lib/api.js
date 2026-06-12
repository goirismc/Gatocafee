// lib/api.js
// Cliente HTTP centralizado con JWT automático
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Asegurar que, si existe NEXT_PUBLIC_API_URL en tiempo de ejecución, se use como baseURL
if (process.env.NEXT_PUBLIC_API_URL) {
  api.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL;
}

// En entorno de desarrollo forzamos la URL del backend en el cliente para evitar sondas
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  api.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
  console.debug('[api] forced client baseURL ->', api.defaults.baseURL);
}

// Debug: mostrar baseURL en desarrollo para rastrear requests fallidas
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  try {
    console.debug('[api] inicial baseURL ->', api.defaults.baseURL);
    try { window.__GATOCAFEE_API_BASE = api.defaults.baseURL } catch(e) {}
  } catch (e) { /* ignore */ }
}

// Intento inteligente: si `NEXT_PUBLIC_API_URL` NO está definido, probamos puertos comunes
const COMMON_BACKEND_PORTS = [5001, 5000, 5002, 5003, 5004, 5005];
async function probeBackend() {
  if (process.env.NEXT_PUBLIC_API_URL) return null; // respeta variable de entorno fija
  const origins = COMMON_BACKEND_PORTS.map(p => `http://localhost:${p}`);
  for (const origin of origins) {
    try {
      // Usar axios sin interceptores para comprobar health
      const res = await axios.get(`${origin}/api/health`, { timeout: 2000 });
      if (res?.data?.success) {
        const base = `${origin}/api`;
        api.defaults.baseURL = base;
        return base;
      }
    } catch (e) {
      // ignorar y seguir probando
    }
  }
  return null;
}

// En desarrollo, enviar automáticamente el header que permite el bypass de auth en el backend
// No enviar headers de bypass aquí. Use autenticación real.

// ── Interceptor de REQUEST: adjunta token automáticamente ──
api.interceptors.request.use((config) => {
  // Bloquear solicitudes con 'undefined' en la URL (evita DELETE /resource/undefined)
  if (config && config.url && String(config.url).includes('/undefined')) {
    return Promise.reject(new Error('Invalid resource id in request URL'));
  }
  if (typeof window !== 'undefined') {
    // No agregar headers de bypass; agregar solo Authorization si existe
    const token = localStorage.getItem('gatocafee_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Log request details en desarrollo para depuración
    if (process.env.NODE_ENV !== 'production') {
      try {
        const fullUrl = (config.baseURL || api.defaults.baseURL || '') + (config.url || '');
        console.debug('[api] request ->', config.method?.toUpperCase(), fullUrl, {
          hasAuth: !!config.headers.Authorization,
          xDevAuth: !!(config.headers['X-DEV-AUTH'] || config.headers['x-dev-auth']),
        });
      } catch (e) {}
    }
  }
  return config;
});

// ── Interceptor de RESPONSE: maneja 401 globalmente ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      try {
        console.error('[api] response error ->', error.message, {
          config: error.config ? { method: error.config.method, baseURL: error.config.baseURL, url: error.config.url } : undefined,
          response: error.response ? { status: error.response.status, data: error.response.data } : undefined,
        });
      } catch (e) {}
    }
    const config = error.config || {};
    // Evitar reintentos infinitos
    if (config && config._retry) return Promise.reject(error);

    // Si el error no tiene response (network error) o 404 genérico, intentar detectar backend
    const shouldProbe = !error.response || error.response.status === 404;
    // Solo probamos si no hay una URL fija definida en el cliente (NEXT_PUBLIC_API_URL)
    if (!process.env.NEXT_PUBLIC_API_URL && shouldProbe) {
      config._retry = true;
      return probeBackend().then((base) => {
        if (!base) return Promise.reject(error);
        // Reintentar la petición original con la nueva baseURL
        config.baseURL = api.defaults.baseURL;
        return axios(config);
      }).catch(() => Promise.reject(error));
    }

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
