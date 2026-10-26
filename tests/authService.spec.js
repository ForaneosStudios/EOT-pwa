import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAuthCallback } from '../src/services/authCallback.js';
import * as auth from '../src/services/authService.js';

const { client, api } = vi.hoisted(() => ({
  client: { auth: { resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), setSession: vi.fn(), getUser: vi.fn(), getSession: vi.fn(), signOut: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), resend: vi.fn() } },
  api: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('../src/services/supabase.js', () => ({ supabase: client, requireSupabase: () => client }));
vi.mock('../src/services/apiClient.js', () => ({ apiClient: api }));

beforeEach(() => { vi.resetAllMocks(); window.history.replaceState(null, '', '/'); });

describe('authentication service', () => {
  it('registers with a confirmation redirect and never supplies a role', async () => {
    client.auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const result = await auth.registerUser({ userName: ' Hero ', email: ' hero@example.com ', password: 'Password1' });
    expect(result).toEqual({ needsConfirmation: true, email: 'hero@example.com' });
    expect(client.auth.signUp).toHaveBeenCalledWith({ email: 'hero@example.com', password: 'Password1', options: { data: { username: 'Hero' }, emailRedirectTo: `${window.location.origin}/auth/confirm` } });
  });

  it('handles an immediate session and registration errors', async () => {
    client.auth.signUp.mockResolvedValueOnce({ data: { session: {} }, error: null }).mockResolvedValueOnce({ error: new Error('invalid') });
    expect((await auth.registerUser({ userName: 'Hero', email: 'hero@example.com', password: 'Password1' })).needsConfirmation).toBe(false);
    await expect(auth.registerUser({ userName: 'Hero', email: 'hero@example.com', password: 'Password1' })).rejects.toThrow('invalid');
  });

  it('resends confirmation and propagates errors', async () => {
    client.auth.resend.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error('limited') });
    await auth.resendConfirmation(' hero@example.com ');
    expect(client.auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'hero@example.com', options: { emailRedirectTo: `${window.location.origin}/auth/confirm` } });
    await expect(auth.resendConfirmation('hero@example.com')).rejects.toThrow('limited');
  });

  it('signs in and loads the backend profile, or reports an authentication failure', async () => {
    client.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: { id: 'auth-id' } }, error: null }).mockResolvedValueOnce({ error: new Error('invalid credentials') });
    api.get.mockResolvedValue({ data: { username: 'Hero', role: 'USER' } });
    expect(await auth.loginUser({ email: ' hero@example.com ', password: 'Password1' })).toEqual({ username: 'Hero', role: 'USER' });
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'hero@example.com', password: 'Password1' });
    await expect(auth.loginUser({ email: 'hero@example.com', password: 'wrong' })).rejects.toThrow('invalid credentials');
  });

  it('requests a reset using the configured callback and handles errors', async () => {
    client.auth.resetPasswordForEmail.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error('failed') });
    await auth.requestPasswordReset(' user@example.com ');
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', { redirectTo: `${window.location.origin}/auth/reset-password` });
    await expect(auth.requestPasswordReset('user@example.com')).rejects.toThrow('failed');
  });

  it('updates the password and propagates errors', async () => {
    client.auth.updateUser.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error('weak') });
    await auth.updatePassword('new-password');
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'new-password' });
    await expect(auth.updatePassword('weak')).rejects.toThrow('weak');
  });

  it('verifies valid confirmation and recovery sessions and rejects invalid links', async () => {
    const result = { accessToken: 'access', refreshToken: 'refresh', error: null };
    expect(await auth.verifyConfirmation({ error: 'expired' })).toBe(false);
    client.auth.setSession.mockResolvedValueOnce({ error: new Error('expired') }).mockResolvedValue({ error: null });
    expect(await auth.verifyConfirmation(result)).toBe(false);
    client.auth.getUser.mockResolvedValueOnce({ data: { user: { email_confirmed_at: 'now' } }, error: null })
      .mockResolvedValueOnce({ data: { user: {} }, error: null });
    expect(await auth.verifyConfirmation(result)).toBe(true);
    expect(await auth.verifyConfirmation({ ...result, recovery: true })).toBe(true);
    expect(client.auth.setSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' });
  });

  it('cleans sensitive tokens from the callback URL', () => {
    window.history.replaceState(null, '', '/auth/reset-password#access_token=a&refresh_token=b&type=recovery');
    expect(auth.takeConfirmationResult()).toMatchObject({ accessToken: 'a', recovery: true });
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/auth/reset-password');
    expect(parseAuthCallback(new URL('https://example.com/'))).toBeNull();
    expect(auth.takeConfirmationResult()).toMatchObject({ recovery: true });
  });

  it('recognizes confirmation, recovery and expired callback URLs', () => {
    expect(parseAuthCallback(new URL('https://example.com/auth/confirm#type=signup&access_token=a&refresh_token=r')))
      .toEqual({ error: null, accessToken: 'a', refreshToken: 'r', recovery: false });
    expect(parseAuthCallback(new URL('https://example.com/auth/reset-password?error_code=expired')))
      .toEqual({ error: 'expired', accessToken: null, refreshToken: null, recovery: true });
    expect(parseAuthCallback(new URL('https://example.com/#type=recovery'))?.recovery).toBe(true);
  });

  it('loads or creates a profile using the authenticated user', async () => {
    api.get.mockResolvedValueOnce({ data: { username: 'hero' } }).mockRejectedValueOnce({ response: { status: 403 } });
    api.post.mockResolvedValue({ data: { username: 'hero' } });
    expect(await auth.loadProfile({})).toEqual({ username: 'hero' });
    expect(await auth.loadProfile({ user_metadata: { username: ' hero ' } })).toEqual({ username: 'hero' });
    expect(api.post).toHaveBeenCalledWith('/users/me/profile', { username: 'hero' });
  });

  it('restores and signs out a session', async () => {
    client.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    expect(await auth.restoreUser()).toBeNull();
    client.auth.signOut.mockResolvedValue({ error: null });
    await auth.logoutUser();
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
