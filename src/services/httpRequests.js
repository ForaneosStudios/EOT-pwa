import { apiClient } from './apiClient.js';

export async function getRequest(route, queryParams = {}) {
  const response = await apiClient.get(route, { params: queryParams });
  return response.data;
}

export async function postRequest(route, requestBody) {
  const response = await apiClient.post(route, requestBody);
  return response.data;
}
