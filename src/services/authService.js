import { postRequest } from './httpRequests.js';
import { apiRoutes } from './apiRoutes.js';

// TODO: definir el formato del JSON que espera el backend para el registro.
function buildRegisterBody(/* formValues */) {
  return {};
}

export function registerUser(formValues) {
  return postRequest(apiRoutes.auth.register, buildRegisterBody(formValues));
}
