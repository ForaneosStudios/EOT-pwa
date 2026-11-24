import { apiClient, isConnectionError } from './apiClient.js';
import { readCache } from './offline/readCache.js';
import { requireSupabase, supabase } from './supabase.js';
import { parseAuthCallback } from './authCallback.js';
import { LEGAL_VERSION } from '../content/legal.js';

const confirmationUrl = () => `${window.location.origin}/auth/confirm`;

// Password recovery is owned by the backend (themed email, 10 minute single-use link).
export async function requestPasswordReset(email) {
  const { data } = await apiClient.post('/auth/password-reset/request', { email: email.trim() });
  return data;
}

export async function validateResetToken(token) {
  const { data } = await apiClient.get('/auth/password-reset/validate', { params: { token } });
  return data.valid === true;
}

export async function confirmPasswordReset(token, password) {
  await apiClient.post('/auth/password-reset/confirm', { token, password });
  // The backend revoked every session; drop the local copy too (ignore a missing session).
  try { await logoutUser(); } catch { /* nothing to sign out */ }
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
    // The sign-up form only submits after both boxes are checked: keep when and which version was accepted.
    options: { data: { username: userName.trim(), terms_version: LEGAL_VERSION, terms_accepted_at: new Date().toISOString() } },
  });
  if (error) throw error;
  if (!data.session) {
    throw new Error('No se pudo iniciar la sesión. Intenta iniciar sesión con tu correo y contraseña.');
  }
  return loadProfile(data.user || data.session.user);
}

export async function isUsernameAvailable(userName) {
  const { data } = await apiClient.get('/users/availability', { params: { username: userName.trim() } });
  return data.available;
}

export async function resendConfirmation(email) {
  const { error } = await requireSupabase().auth.resend({
    type: 'signup', email: email.trim(), options: { emailRedirectTo: confirmationUrl() },
  });
  if (error) throw error;
}

// The profile is kept in the per-account read cache (IndexedDB) under the same key as the
// /users/me read, so the session survives a reload without internet.
const PROFILE_READ = '/users/me';

async function rememberProfile(authUser, profile) {
  if (authUser?.id && profile) await readCache.put(authUser.id, PROFILE_READ, profile).catch(() => {});
  return profile;
}

async function savedProfile(authUserId) {
  try {
    const entry = await readCache.get(authUserId || readCache.owner(), PROFILE_READ);
    return entry?.data || null;
  } catch {
    return null;
  }
}

// Auth metadata supplies only the initial username, never a role or permissions.
export async function loadProfile(authUser) {
  try {
    return rememberProfile(authUser, (await apiClient.get('/users/me')).data);
  } catch (error) {
    if (error.response?.status !== 403) throw error;
    const username = authUser?.user_metadata?.username;
    if (typeof username !== 'string' || username.trim().length < 3) {
      throw new Error('La cuenta no tiene un nombre de usuario válido para crear su perfil.', { cause: error });
    }
    return rememberProfile(authUser, (await apiClient.post('/users/me/profile', { username: username.trim() })).data);
  }
}

export async function loginUser({ email, password }) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return loadProfile(data.user);
}

// Without internet the session is kept with the saved profile: the token can be renewed and the
// profile reloaded once the connection is back. Only a real answer from the servers ends it.
export async function restoreUser() {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) {
    const saved = isConnectionError(error) ? await savedProfile() : null;
    if (saved) return saved;
    throw error;
  }
  if (!data.session) return null;
  try {
    return await loadProfile(data.session.user);
  } catch (loadError) {
    const saved = isConnectionError(loadError) ? await savedProfile(data.session.user.id) : null;
    if (saved) return saved;
    throw loadError;
  }
}

export async function logoutUser() {
  // Remove this account's saved data (profile included) from the device before ending the session.
  try { await readCache.clear(); } catch { /* best effort */ }
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
