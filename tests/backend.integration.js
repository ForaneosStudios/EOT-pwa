import { test } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';

const api = (process.env.EOT_TEST_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const origin = process.env.EOT_TEST_ORIGIN || 'http://localhost:3000';

test('backend exposes public categories', async () => {
  const response = await fetch(`${api}/categories`);
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(await response.json()));
});

test('backend rejects unauthenticated profile requests with a structured error', async () => {
  const response = await fetch(`${api}/users/me`);
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.status, 401);
  for (const field of ['code', 'message', 'timestamp', 'path', 'requestId']) assert.ok(body[field], `Missing ${field}`);
});

test('backend rejects an invalid Bearer token', async () => {
  const response = await fetch(`${api}/users/me`, { headers: { Authorization: 'Bearer invalid-token' } });
  assert.equal(response.status, 401);
});

test('backend permits the frontend origin and Bearer preflight', async () => {
  const response = await fetch(`${api}/users/me`, {
    method: 'OPTIONS',
    headers: { Origin: origin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization,content-type' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
});
