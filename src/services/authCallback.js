// Parse callbacks separately so URL cleanup happens even if verification fails.
export function parseAuthCallback(location) {
  const hash = new URLSearchParams(location.hash.slice(1));
  const query = new URLSearchParams(location.search);
  const recovery = location.pathname === '/auth/reset-password' || hash.get('type') === 'recovery';
  const isCallback = location.pathname === '/auth/confirm' || recovery
    || hash.get('type') === 'signup' || hash.has('error_code') || query.has('error_code');
  if (!isCallback) return null;
  return {
    error: hash.get('error_code') || query.get('error_code'),
    accessToken: hash.get('access_token'),
    refreshToken: hash.get('refresh_token'),
    recovery,
  };
}
