import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, AUTH_REQUIRED_EVENT, getApiErrorMessage } from '../src/services/apiClient.js';

const { supabase } = vi.hoisted(() => ({ supabase: { auth: { getSession: vi.fn(), refreshSession: vi.fn(), signOut: vi.fn() } } }));
vi.mock('../src/services/supabase.js', () => ({ supabase }));

beforeEach(() => {
  vi.resetAllMocks();
  supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null });
});

describe('API client', () => {
  it('adds the access token to requests', async () => {
    const adapter = vi.fn().mockResolvedValue({ status: 200, data: {} });
    await apiClient.get('/users/me', { adapter });
    expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer token');
  });

  it('refreshes once and retries unauthorized requests', async () => {
    supabase.auth.refreshSession.mockResolvedValue({ data: { session: { access_token: 'renewed' } }, error: null });
    const adapter = vi.fn().mockImplementationOnce((config) => Promise.reject({ config, response: { status: 401 } }))
      .mockResolvedValueOnce({ status: 200, data: 'ok' });
    const response = await apiClient.get('/users/me', { adapter });
    expect(response.data).toBe('ok');
    expect(supabase.auth.refreshSession).toHaveBeenCalledOnce();
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it('notifies when the retried request remains unauthorized', async () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_REQUIRED_EVENT, listener);
    supabase.auth.refreshSession.mockResolvedValue({ data: { session: { access_token: 'new' } }, error: null });
    const adapter = vi.fn().mockImplementation((config) => Promise.reject({ config, response: { status: 401 } }));
    await expect(apiClient.get('/users/me', { adapter })).rejects.toBeTruthy();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(AUTH_REQUIRED_EVENT, listener);
  });

  it('preserves a session on a temporary refresh failure', async () => {
    supabase.auth.refreshSession.mockRejectedValue(new Error('network error'));
    const adapter = vi.fn().mockImplementation((config) => Promise.reject({ config, response: { status: 401 } }));
    await expect(apiClient.get('/users/me', { adapter })).rejects.toThrow('network error');
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it('maps API and authentication errors', () => {
    expect(getApiErrorMessage({ isAxiosError: true, response: { status: 403, data: {} } })).toMatch(/permiso/);
    expect(getApiErrorMessage({ isAxiosError: true })).toMatch(/conectar/);
    expect(getApiErrorMessage({ code: 'invalid_credentials' })).toMatch(/incorrectos/);
  });
});
