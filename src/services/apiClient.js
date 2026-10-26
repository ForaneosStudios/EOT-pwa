import axios from 'axios';
import { supabase } from './supabase.js';

export const AUTH_REQUIRED_EVENT = 'eot:auth-required';

let refreshPromise = null;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session?.access_token) {
      config.headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  }
  return config;
});

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

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    if (!supabase || error.response?.status !== 401 || !request) {
      return Promise.reject(error);
    }

    if (request.authRetry) {
      notifyAuthenticationRequired();
      return Promise.reject(error);
    }

    request.authRetry = true;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        notifyAuthenticationRequired();
        return Promise.reject(error);
      }

      const accessToken = await refreshAccessToken();
      request.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(request);
    } catch (refreshError) {
      // A temporary network failure does not prove that the session is invalid.
      if (refreshError?.status === 400 || refreshError?.status === 401 || refreshError?.status === 403) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        notifyAuthenticationRequired();
      }
      return Promise.reject(refreshError);
    }
  },
);

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
    email_not_confirmed: 'Confirma tu correo antes de iniciar sesión.',
    over_email_send_rate_limit: 'Se han enviado demasiados correos. Espera unos minutos e inténtalo de nuevo.',
    over_request_rate_limit: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    weak_password: 'La contraseña no cumple los requisitos de seguridad.',
  };
  return messages[error?.code] || (error?.message?.startsWith('Configura VITE_') ? error.message : fallback);
}
