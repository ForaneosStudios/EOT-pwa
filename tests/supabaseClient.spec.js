import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createClient = vi.fn(() => ({ auth: {} }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

async function loadModule() {
  vi.resetModules();
  return import('../src/services/supabase.js');
}

beforeEach(() => createClient.mockClear());
afterEach(() => vi.unstubAllEnvs());

describe('Supabase client', () => {
  it('stays disabled without configuration and explains what is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    const { supabase, requireSupabase } = await loadModule();
    expect(supabase).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
    expect(() => requireSupabase()).toThrow(/VITE_SUPABASE_URL/);
  });

  it('needs both the URL and the key', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://proyecto.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    expect((await loadModule()).supabase).toBeNull();
  });

  it('creates a client that keeps the session but never reads tokens from the URL', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://proyecto.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_demo');
    const { supabase, requireSupabase } = await loadModule();
    expect(createClient).toHaveBeenCalledWith('https://proyecto.supabase.co', 'sb_publishable_demo', {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
    expect(requireSupabase()).toBe(supabase);
  });
});
