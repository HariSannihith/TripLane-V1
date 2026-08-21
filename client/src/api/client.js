import axios from 'axios';

export const TOKEN_KEY = 'triplane.token';

/**
 * Single Axios instance for the whole app. Requests go to /api, which Vite
 * proxies to the Express server in development and a reverse proxy serves in
 * production — so no API host is hard-coded into the bundle.
 */
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Registered by AuthContext so a rejected token can clear the session once,
// centrally, instead of every component handling 401s itself.
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isAuthProbe = error.config?.url?.startsWith('/auth/');

    if (status === 401 && !isAuthProbe && onUnauthorized) onUnauthorized();

    return Promise.reject(error);
  }
);

/** Normalises any Axios failure into the shape the UI renders. */
export function parseApiError(error, fallback = 'Something went wrong. Please try again.') {
  if (error.response?.data?.error) {
    const { message, code, details } = error.response.data.error;
    return { message: message || fallback, code, details: details || {} };
  }
  if (error.request) {
    return { message: 'Cannot reach the server. Is the API running?', code: 'NETWORK', details: {} };
  }
  return { message: fallback, code: undefined, details: {} };
}

export default api;
