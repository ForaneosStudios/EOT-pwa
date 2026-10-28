import { apiClient } from './apiClient.js';
import { requireSupabase, supabase } from './supabase.js';
import { parseAuthCallback } from './authCallback.js';

const confirmationUrl = () => `${window.location.origin}/auth/confirm`;

export async function requestPasswordReset(email) {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(password) {
  const { error } = await requireSupabase().auth.updateUser({ password });
  if (error) throw error;
}

export async function registerUser({ userName, email, password }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { username: userName.trim() } },
  });
  if (error) throw error;
  if (!data.session) {
    throw new Error('No se pudo iniciar la sesión. Intenta iniciar sesión con tu correo y contraseña.');
  }
  return loadProfile(data.user || data.session.user);
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

export function subscribeToAuthChanges(listener) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event) => {
    listener(event);
  });
  return () => data.subscription.unsubscribe();
}

// Capture the one-use result before removing tokens from the browser address bar.
export function takeConfirmationResult() {
  const result = parseAuthCallback(window.location);
  if (!result) return null;
  window.history.replaceState(null, '', result.recovery ? '/auth/reset-password' : '/auth/confirm');
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
  return !userError && Boolean(data.user && (result.recovery || data.user.email_confirmed_at));
}
