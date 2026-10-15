import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// TODO: devolver el JWT de la sesión actual de Supabase cuando se integre la autenticación.
async function getAccessToken() {
  const storedSession = localStorage.getItem('eot.session');
  if (!storedSession) return null;

  try {
    return JSON.parse(storedSession).accessToken ?? null;
  } catch {
    return null;
  }
}

apiClient.interceptors.request.use(async (requestConfig) => {
  const accessToken = await getAccessToken();
  if (accessToken) {
    requestConfig.headers.Authorization = `Bearer ${accessToken}`;
  }
  return requestConfig;
});

export function getApiErrorMessage(error, fallbackMessage = 'Ocurrió un error inesperado. Inténtalo de nuevo.') {
  if (!error.response) return 'No se pudo conectar con el servidor.';
  return error.response.data?.message ?? fallbackMessage;
}
