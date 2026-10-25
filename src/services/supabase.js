import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Only the publishable key belongs in a browser bundle. Never use a secret key here.
export const supabase = url && key ? createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // Confirmation links are handled explicitly by authService so tokens are
    // removed from the address bar before React renders.
    detectSessionInUrl: false,
  },
}) : null;

export function requireSupabase() {
  if (!supabase) throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.');
  return supabase;
}
