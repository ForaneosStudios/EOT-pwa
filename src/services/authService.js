import { apiClient } from './apiClient.js';
import { requireSupabase } from './supabase.js';

const confirmationUrl = () => `${window.location.origin}/auth/confirm`;

export async function registerUser({ userName, email, password }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { username: userName.trim() }, emailRedirectTo: confirmationUrl() },
  });
  if (error) throw error;
  return { needsConfirmation: !data.session, email: email.trim() };
}

export async function resendConfirmation(email) {
  const { error } = await requireSupabase().auth.resend({
    type: 'signup', email: email.trim(), options: { emailRedirectTo: confirmationUrl() },
  });
  if (error) throw error;
}

// Auth metadata supplies only the initial username, never a role or permissions.
export async function loadProfile(authUser) {
  try {
    return (await apiClient.get('/users/me')).data;
  } catch (error) {
    if (error.response?.status !== 403) throw error;
    const username = authUser?.user_metadata?.username;
    if (typeof username !== 'string' || username.trim().length < 3) {
      throw new Error('La cuenta no tiene un nombre de usuario válido para crear su perfil.', { cause: error });
    }
    return (await apiClient.post('/users/me/profile', { username: username.trim() })).data;
  }
}

export async function loginUser({ email, password }) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return loadProfile(data.user);
}

export async function restoreUser() {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw error;
  return data.session ? loadProfile(data.session.user) : null;
}

export async function logoutUser() {
  const { error } = await requireSupabase().auth.signOut({ scope: 'local' });
  if (error) throw error;
}

// Capture the one-use result before removing tokens from the browser address bar.
export function takeConfirmationResult() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const isCallback = window.location.pathname === '/auth/confirm'
    || hash.get('type') === 'signup' || hash.has('error_code');
  if (!isCallback) return null;
  const result = {
    error: hash.get('error_code') || query.get('error_code'),
    accessToken: hash.get('access_token'),
    refreshToken: hash.get('refresh_token'),
  };
  window.history.replaceState(null, '', '/auth/confirm');
  return result;
}

export async function verifyConfirmation(result) {
  if (result.error || !result.accessToken || !result.refreshToken) return false;
  const client = requireSupabase();
  const { error } = await client.auth.setSession({
    access_token: result.accessToken, refresh_token: result.refreshToken,
  });
  if (error) return false;
  const { data, error: userError } = await client.auth.getUser();
  return !userError && Boolean(data.user?.email_confirmed_at);
}
