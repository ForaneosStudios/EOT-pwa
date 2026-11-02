import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAuthCallback } from '../src/services/authCallback.js';

test('reconoce confirmación y conserva los tokens solo para verificarlos', () => {
  const result = parseAuthCallback(new URL('https://example.com/auth/confirm#type=signup&access_token=a&refresh_token=r'));
  assert.deepEqual(result, { error: null, accessToken: 'a', refreshToken: 'r', recovery: false });
});

test('distingue enlaces de recuperación y recoge errores en query', () => {
  const result = parseAuthCallback(new URL('https://example.com/auth/reset-password?error_code=expired'));
  assert.equal(result.recovery, true);
  assert.equal(result.error, 'expired');
  assert.equal(result.accessToken, null);
});

test('ignora navegación normal', () => {
  assert.equal(parseAuthCallback(new URL('https://example.com/')), null);
});
