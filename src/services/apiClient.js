import axios from 'axios';
import { supabase } from './supabase.js';
import { recordServerDate } from './offline/serverClock.js';
import { readCache, readKey, staleData } from './offline/readCache.js';

export const AUTH_REQUIRED_EVENT = 'eot:auth-required';

let refreshPromise = null;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// True for failures caused by having no connection (or the server being down), as opposed to the
// server answering with a real error.
export function isConnectionError(error) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (error?.name === 'AuthRetryableFetchError') return true;
  if (error?.isAxiosError || error?.config) return !error.response || error.response.status >= 500;
  return error instanceof TypeError && /fetch|network/i.test(error.message || '');
}

apiClient.interceptors.request.use(async (config) => {
  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    // Offline, an expired token cannot be renewed; send the request anyway so a read can still be
    // answered from the saved data. Online, a session error is a real problem.
    if (error && !isConnectionError(error)) throw error;
    if (data?.session?.access_token) {
      config.headers.Authorization = `Bearer ${data.session.access_token}`;
    }
    config.cacheOwner = data?.session?.user?.id || null;
  }
  return config;
});

// Only plain API reads are saved: not the health probe (absolute URL, empty base) nor password reset.
function isCacheableRead(config) {
  return Boolean(config) && (config.method || 'get').toLowerCase() === 'get' && config.cache !== false
    && config.baseURL !== '' && typeof config.url === 'string' && !/^https?:/i.test(config.url) && !config.url.startsWith('/auth/');
}

async function refreshAccessToken() {
  refreshPromise ??= supabase.auth.refreshSession()
    .then(({ data, error }) => {
      if (error) throw error;
      if (!data.session?.access_token) throw new Error('No se pudo renovar la sesión.');
      return data.session.access_token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function notifyAuthenticationRequired() {
  window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT));
}

// Track the server clock from every response (errors included) for X-Client-Intent-At.
// Registered before the auth interceptor; it never alters the response or the error.
function recordServerClock(response) {
  try {
    recordServerDate(response?.headers?.date);
  } catch {
    // Clock tracking is best effort and must never break a request.
  }
}

apiClient.interceptors.response.use(
  (response) => { recordServerClock(response); return response; },
  (error) => { recordServerClock(error?.response); return Promise.reject(error); },
);

// Save every successful read for the signed-in account (best effort, never blocks the response).
apiClient.interceptors.response.use((response) => {
  const { config } = response;
  if (isCacheableRead(config) && !response.fromCache) {
    staleData.markFresh();
    readCache.put(config.cacheOwner, readKey(config.url, config.params), response.data).catch(() => {});
  }
  return response;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    if (!supabase || error.response?.status !== 401 || !request) {
      throw error;
    }

    if (request.authRetry) {
      notifyAuthenticationRequired();
      throw error;
    }

    request.authRetry = true;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        notifyAuthenticationRequired();
        throw error;
      }

      const accessToken = await refreshAccessToken();
      request.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(request);
    } catch (refreshError) {
      if (refreshError === error) throw error;
      // A temporary network failure does not prove that the session is invalid.
      if (refreshError?.status === 400 || refreshError?.status === 401 || refreshError?.status === 403) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        notifyAuthenticationRequired();
      }
      throw refreshError;
    }
  },
);

// Without connection, answer a read with the last saved copy (marked fromCache) instead of failing.
apiClient.interceptors.response.use(undefined, async (error) => {
  const { config } = error || {};
  if (!isCacheableRead(config) || !isConnectionError(error)) throw error;
  let entry;
  try {
    entry = await readCache.get(config.cacheOwner || readCache.owner(), readKey(config.url, config.params));
  } catch {
    entry = null;
  }
  if (!entry) throw error;
  staleData.markStale(entry.savedAt);
  return { data: entry.data, status: 200, statusText: 'OK', headers: {}, config, request: null, fromCache: true, cachedAt: entry.savedAt };
});

export function getApiErrorMessage(error, fallback = 'Ocurrió un error. Inténtalo de nuevo.') {
  if (error?.isAxiosError) {
    if (!error.response) return 'No se pudo conectar con el servidor.';
    const messages = {
      400: 'Revisa los datos enviados e inténtalo de nuevo.',
      401: 'Tu sesión ha terminado. Inicia sesión nuevamente.',
      403: 'No tienes permiso para realizar esta acción.',
      404: 'No se encontró el recurso solicitado.',
      409: 'La operación entra en conflicto con los datos actuales.',
      500: 'Ocurrió un error en el servidor. Inténtalo más tarde.',
      503: 'El servicio no está disponible. Inténtalo más tarde.',
    };
    return error.response.data?.message || messages[error.response.status] || fallback;
  }
  const messages = {
    invalid_credentials: 'Correo o contraseña incorrectos.',
    user_already_exists: 'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.',
    email_exists: 'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.',
    email_address_invalid: 'Introduce un correo electrónico válido.',
    signup_disabled: 'El registro de cuentas está deshabilitado temporalmente.',
    email_not_confirmed: 'Confirma tu correo antes de iniciar sesión.',
    over_email_send_rate_limit: 'Se han enviado demasiados correos. Espera unos minutos e inténtalo de nuevo.',
    over_request_rate_limit: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    weak_password: 'La contraseña no cumple los requisitos de seguridad.',
  };
  return messages[error?.code] || (error?.message?.startsWith('Configura VITE_') ? error.message : fallback);
}
