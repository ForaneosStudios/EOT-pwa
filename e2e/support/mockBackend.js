import { API_URL, SUPABASE_URL } from '../../playwright.config.js';

const API_HOST = new URL(API_URL).origin;
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-expose-headers': 'Idempotency-Replayed,Retry-After,Location,Date',
};
// Supabase stores the session under sb-<first label of the host>-auth-token.
export const SESSION_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

export const PLAYER = {
  userId: '11111111-1111-4111-8111-111111111111',
  username: 'Alma_Heredera',
  email: 'alma@example.com',
  role: 'USER',
  createdAt: '2026-01-15T10:00:00Z',
  profilePicture: null,
};
export const ADMIN = { ...PLAYER, userId: '22222222-2222-4222-8222-222222222222', username: 'Valkyrie', email: 'admin@example.com', role: 'ADMIN' };

const jwt = (payload) => [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify(payload)).toString('base64url'),
  'firma',
].join('.');

export function sessionFor(user) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: jwt({ sub: user.userId, aud: 'authenticated', role: 'authenticated', exp: now + 3600 }),
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'refresh-e2e',
    user: { id: user.userId, aud: 'authenticated', email: user.email, email_confirmed_at: '2026-01-15T10:00:00Z', user_metadata: { username: user.username } },
  };
}

const json = (route, status, body, headers = {}) => route.fulfill({
  status, contentType: 'application/json', headers: { ...CORS, ...headers }, body: body === undefined ? '' : JSON.stringify(body),
});

const uid = (() => { let n = 0; return (prefix) => `${prefix}-${String(++n).padStart(4, '0')}-e2e`; })();

/**
 * In-memory stand-in for Supabase Auth and the EOT API. It records every request so tests can
 * assert what the browser really sent (headers included) and can be told to misbehave.
 */
export async function mockBackend(context, { user = PLAYER, password = 'Secreta1', takenUsernames = [] } = {}) {
  const state = {
    user,
    threads: [{ threadId: 'thread-seed-1', userId: ADMIN.userId, username: ADMIN.username, title: 'Bienvenidos al Consejo', content: 'Reglas del foro y teorías del reino.', categoryName: 'Comunidad', isLocked: false, createdAt: '2026-11-01T12:00:00Z', updatedAt: null }],
    posts: [{ postId: 'post-seed-1', threadId: 'thread-seed-1', userId: ADMIN.userId, username: ADMIN.username, content: 'Primer comentario del hilo', createdAt: '2026-11-01T13:00:00Z', updatedAt: null, isEdited: false }],
    requests: [],
    // Idempotency keys already processed, mapped to the stored response (what the real backend does).
    processed: new Map(),
    failures: [],
    hold: null,
    stale: new Set(),
    achievements: [],
    clockOffsetSeconds: 0,
  };

  const mutations = (method, path) => state.requests.filter((r) => r.method === method && r.path === path);
  const api = {
    state,
    /** Requests that reached the API, optionally filtered. */
    calls: (method, path) => (method ? mutations(method, path) : state.requests),
    /** Make the next N matching requests fail like a dropped connection (nothing reaches the server). */
    dropNext: (method, path, count = 1) => state.failures.push({ method, path, count, mode: 'drop' }),
    /** Make the next matching request run on the server, then lose its response. */
    loseResponseNext: (method, path) => state.failures.push({ method, path, count: 1, mode: 'lose-response' }),
    /** Hold matching requests until release() is called, to test concurrent requests. */
    holdRequests: (method, path) => { let release; const gate = new Promise((resolve) => { release = resolve; }); state.hold = { method, path, gate }; return () => { release(); state.hold = null; }; },
    /** Answer the next PUT/PATCH to this path with 409 STALE_WRITE, like a newer edit from another device. */
    markStale: (method, path) => state.stale.add(`${method} ${path}`),
    /** Seed the browser with a signed-in session so a test can start inside the app. */
    async signIn(who = user) {
      // Seed once: after signing out, later page loads must not bring the session back.
      await context.addInitScript(([key, session]) => {
        if (window.localStorage.getItem('e2e-session-seeded')) return;
        window.localStorage.setItem('e2e-session-seeded', '1');
        window.localStorage.setItem(key, JSON.stringify(session));
      }, [SESSION_KEY, sessionFor(who)]);
      state.user = who;
    },
  };

  await context.route(`${SUPABASE_URL}/**`, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const url = new URL(request.url());
    if (url.pathname.endsWith('/token')) {
      const body = request.postDataJSON() ?? {};
      if (url.searchParams.get('grant_type') === 'password' && (body.password !== password || body.email !== state.user.email)) {
        return json(route, 400, { code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials', message: 'Invalid login credentials' });
      }
      return json(route, 200, sessionFor(state.user));
    }
    if (url.pathname.endsWith('/signup')) return json(route, 200, sessionFor({ ...state.user, username: body(request).data?.username ?? state.user.username }));
    if (url.pathname.endsWith('/user')) return json(route, 200, sessionFor(state.user).user);
    if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204, headers: CORS });
    return json(route, 200, {});
  });

  function body(request) { try { return request.postDataJSON() ?? {}; } catch { return {}; } }

  await context.route(`${API_HOST}/**`, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname.replace('/api/v1', '') || '/';
    const headers = request.headers();
    const dateHeader = { date: new Date(Date.now() + state.clockOffsetSeconds * 1000).toUTCString() };

    if (url.pathname === '/actuator/health') return json(route, 200, { status: 'UP' }, dateHeader);

    const record = { method, path, query: Object.fromEntries(url.searchParams), headers, body: body(request) };
    state.requests.push(record);

    const failure = state.failures.find((f) => f.method === method && f.path === path && f.count > 0);
    if (failure) {
      failure.count -= 1;
      if (failure.mode === 'drop') { state.requests.pop(); return route.abort('connectionreset'); }
      // lose-response: fall through, process it, then abort instead of answering.
      record.loseResponse = true;
    }
    if (state.hold && state.hold.method === method && state.hold.path === path) await state.hold.gate;

    const idemKey = headers['idempotency-key'];
    if (idemKey && state.processed.has(idemKey)) {
      const saved = state.processed.get(idemKey);
      record.replayed = true;
      return json(route, saved.status, saved.body, { ...dateHeader, 'idempotency-replayed': 'true' });
    }

    const result = handle({ method, path, url, record, headers });
    if (idemKey && result.status < 500) state.processed.set(idemKey, result);
    if (record.loseResponse) return route.abort('connectionreset');
    return json(route, result.status, result.body, dateHeader);
  });

  function handle({ method, path, url, record }) {
    const ok = (body, status = 200) => ({ status, body });
    if (state.stale.has(`${method} ${path}`)) {
      state.stale.delete(`${method} ${path}`);
      const current = state.posts.find((p) => path.endsWith(p.postId));
      return { status: 409, body: { status: 409, code: 'STALE_WRITE', message: 'Otra edicion mas reciente de este comentario ya se aplico', current } };
    }
    if (method === 'GET' && path === '/users/me') return ok(state.user);
    if (method === 'GET' && path === '/users/availability') return ok({ available: !takenUsernames.includes(url.searchParams.get('username')) });
    if (method === 'GET' && path === '/user-achievements/me') return ok(state.achievements);
    if (method === 'GET' && path === '/threads/search') return ok({ content: state.threads, first: true, last: true, number: 0, size: 10 });
    const threadMatch = path.match(/^\/threads\/([^/]+)$/);
    if (threadMatch) {
      const thread = state.threads.find((t) => t.threadId === threadMatch[1]);
      if (!thread) return ok({ status: 404, code: 'RESOURCE_NOT_FOUND', message: 'Hilo no encontrado' }, 404);
      if (method === 'GET') return ok(thread);
      if (method === 'DELETE') { state.threads = state.threads.filter((t) => t !== thread); return { status: 204, body: undefined }; }
      if (method === 'PUT') { Object.assign(thread, record.body); return ok(thread); }
    }
    if (method === 'GET' && path === '/posts/page') {
      const parent = url.searchParams.get('parentPostId');
      const content = state.posts.filter((p) => p.threadId === url.searchParams.get('threadId') && (parent ? p.parentPostId === parent : !p.parentPostId));
      return ok({ content, first: true, last: true, number: 0, size: 10 });
    }
    if (method === 'POST' && path === '/threads') {
      const thread = { threadId: uid('thread'), userId: state.user.userId, username: state.user.username, categoryName: 'Comunidad', isLocked: false, createdAt: new Date().toISOString(), updatedAt: null, ...record.body };
      state.threads.unshift(thread);
      return ok(thread, 201);
    }
    if (method === 'POST' && path === '/posts') {
      const post = { postId: uid('post'), username: state.user.username, createdAt: new Date().toISOString(), updatedAt: null, isEdited: false, ...record.body };
      state.posts.push(post);
      return ok(post, 201);
    }
    if (method === 'POST' && /^\/posts\/[^/]+\/reports$/.test(path)) return ok({ reportId: uid('report'), status: 'PENDING', reason: record.body.reason });
    const postMatch = path.match(/^\/posts\/([^/]+)$/);
    if (postMatch && method === 'PUT') {
      const post = state.posts.find((p) => p.postId === postMatch[1]);
      if (!post) return ok({ status: 404, code: 'RESOURCE_NOT_FOUND', message: 'Post no encontrado' }, 404);
      Object.assign(post, { content: record.body.content, isEdited: true });
      return ok(post);
    }
    if (postMatch && method === 'DELETE') {
      const exists = state.posts.some((p) => p.postId === postMatch[1]);
      if (!exists) return ok({ status: 404, code: 'RESOURCE_NOT_FOUND', message: 'Post no encontrado' }, 404);
      state.posts = state.posts.filter((p) => p.postId !== postMatch[1]);
      return { status: 204, body: undefined };
    }
    if (method === 'PATCH' && path === '/users/me/profile-picture') { state.user = { ...state.user, profilePicture: record.body.profilePicture }; return ok(state.user); }
    if (method === 'GET' && ['/users', '/achievements', '/categories'].includes(path)) return ok([]);
    return ok({ status: 404, code: 'RESOURCE_NOT_FOUND', message: `Sin simulación para ${method} ${path}` }, 404);
  }

  return api;
}
