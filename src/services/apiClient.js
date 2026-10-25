import axios from 'axios';
import { supabase } from './supabase.js';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session?.access_token) config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});

export function getApiErrorMessage(error, fallback = 'Ocurrió un error. Inténtalo de nuevo.') {
  if (error?.isAxiosError) {
    if (!error.response) return 'No se pudo conectar con el servidor.';
    return error.response.data?.message || fallback;
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
