import { apiClient } from './apiClient.js';
import { apiRoutes } from './apiRoutes.js';

const sessionKey = 'eot.session';

export async function registerUser({ userName, email, password }) {
  const response = await apiClient.post(apiRoutes.users.create, {
    username: userName.trim(),
    email: email.trim(),
    password,
  });
  const user = response.data;
  return {
    userId: user.userId,
    username: user.username,
    email: user.email,
    profilePicture: user.profilePicture ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function loginUser({ email, password }) {
  const response = await apiClient.post(apiRoutes.users.login, {
    email: email.trim(),
    password,
  });
  const data = response.data ?? {};
  const session = {
    isAuthenticated: true,
    accessToken: data.accessToken ?? data.token ?? data.jwt ?? null,
    user: data.user ?? data.userData ?? {
      userId: data.userId,
      username: data.username,
      email: data.email ?? email.trim(),
      profilePicture: data.profilePicture ?? null,
    },
  };

  localStorage.setItem(sessionKey, JSON.stringify(session));
  return session;
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionKey)) ?? null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(sessionKey);
}
