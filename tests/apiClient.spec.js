import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, AUTH_REQUIRED_EVENT, getApiErrorMessage, isConnectionError } from '../src/services/apiClient.js';
import { readCache, staleData } from '../src/services/offline/readCache.js';

const { supabase } = vi.hoisted(() => ({ supabase: { auth: { getSession: vi.fn(), refreshSession: vi.fn(), signOut: vi.fn() } } }));
vi.mock('../src/services/supabase.js', () => ({ supabase }));

beforeEach(async () => {
  vi.resetAllMocks();
  supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token', user: { id: 'auth-1' } } }, error: null });
  await readCache.clear();
  staleData.markFresh();
});

const networkError = (config) => Promise.reject(Object.assign(new Error('Network Error'), { config, isAxiosError: true }));

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
    expect(getApiErrorMessage({ code: 'user_already_exists' })).toMatch(/ya está registrado/);
    expect(getApiErrorMessage({ code: 'email_exists' })).toMatch(/recupera tu contraseña/);
  });

  it('saves reads per account and answers them from the device without connection', async () => {
    const fresh = vi.fn().mockImplementation((config) => Promise.resolve({ status: 200, data: [{ achId: 'a', progress: 3 }], config }));
    await apiClient.get('/user-achievements/me', { adapter: fresh });
    await vi.waitFor(async () => expect(await readCache.get('auth-1', '/user-achievements/me')).not.toBeNull());

    const offline = vi.fn().mockImplementation(networkError);
    const response = await apiClient.get('/user-achievements/me', { adapter: offline });
    expect(response.fromCache).toBe(true);
    expect(response.data).toEqual([{ achId: 'a', progress: 3 }]);
    expect(staleData.getSnapshot()).toEqual(expect.any(Number));

    // Fresh data clears the notice again.
    await apiClient.get('/user-achievements/me', { adapter: fresh });
    expect(staleData.getSnapshot()).toBeNull();
  });

  it('serves saved reads even when an expired session cannot be renewed offline', async () => {
    await apiClient.get('/users/me', { adapter: vi.fn().mockImplementation((config) => Promise.resolve({ status: 200, data: { username: 'hero' }, config })) });
    await vi.waitFor(async () => expect(await readCache.get('auth-1', '/users/me')).not.toBeNull());
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: Object.assign(new Error('fetch failed'), { name: 'AuthRetryableFetchError' }) });
    const adapter = vi.fn().mockImplementation(networkError);
    expect((await apiClient.get('/users/me', { adapter })).data).toEqual({ username: 'hero' });
    expect(adapter.mock.calls[0][0].headers.Authorization).toBeUndefined();
  });

  it('still fails reads that were never saved, real server answers and writes', async () => {
    await expect(apiClient.get('/threads/search', { adapter: vi.fn().mockImplementation(networkError), params: { page: 9 } })).rejects.toThrow('Network Error');
    await apiClient.get('/categories', { adapter: vi.fn().mockImplementation((config) => Promise.resolve({ status: 200, data: ['x'], config })) });
    await expect(apiClient.get('/categories', { adapter: vi.fn().mockImplementation((config) => Promise.reject({ config, response: { status: 404 } })) }))
      .rejects.toMatchObject({ response: { status: 404 } });
    await expect(apiClient.post('/categories', {}, { adapter: vi.fn().mockImplementation(networkError) })).rejects.toThrow('Network Error');
    await expect(apiClient.get('/auth/password-reset/validate', { adapter: vi.fn().mockImplementation(networkError) })).rejects.toThrow('Network Error');
  });

  it('rejects requests when the session lookup fails for a non-network reason', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: new Error('corrupt session') });
    await expect(apiClient.get('/users/me', { adapter: vi.fn() })).rejects.toThrow('corrupt session');
  });

  it('recognizes connection failures', () => {
    expect(isConnectionError({ config: {}, isAxiosError: true })).toBe(true);
    expect(isConnectionError({ config: {}, response: { status: 503 } })).toBe(true);
    expect(isConnectionError({ config: {}, response: { status: 404 } })).toBe(false);
    expect(isConnectionError({ name: 'AuthRetryableFetchError' })).toBe(true);
    expect(isConnectionError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isConnectionError(new Error('bad'))).toBe(false);
    const offline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect(isConnectionError(new Error('bad'))).toBe(true);
    offline.mockRestore();
  });
});
