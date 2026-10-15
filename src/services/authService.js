import { apiClient } from './apiClient.js';
import { apiRoutes } from './apiRoutes.js';

// TODO: ajustar los nombres de los campos al contrato del backend si difieren.
export async function registerUser({ userName, email, password }) {
  const response = await apiClient.post(apiRoutes.auth.register, {
    userName: userName.trim(),
    email: email.trim(),
    password,
  });
  return response.data;
}
