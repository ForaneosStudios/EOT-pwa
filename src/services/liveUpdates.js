import { supabase } from './supabase.js';

// Live game updates (new record, achievement progress, ranking) pushed by the backend over
// Server-Sent Events. EventSource cannot send the Bearer token, so the stream is read with fetch.
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const MIN_RETRY_MS = 2000;
const MAX_RETRY_MS = 30000;

/** Splits buffered stream text into complete SSE events; returns the unfinished remainder. */
export function parseSse(buffer) {
  const blocks = buffer.replace(/\r\n/g, '\n').split('\n\n');
  const rest = blocks.pop() ?? '';
  const events = [];
  for (const block of blocks) {
    let type = 'message';
    const data = [];
    for (const line of block.split('\n')) {
      if (line.startsWith(':')) continue; // heartbeat comment
      const separator = line.indexOf(':');
      const field = separator === -1 ? line : line.slice(0, separator);
      const value = separator === -1 ? '' : line.slice(separator + 1).replace(/^ /, '');
      if (field === 'event') type = value;
      if (field === 'data') data.push(value);
    }
    if (data.length === 0 && type === 'message') continue;
    let payload;
    try { payload = data.length ? JSON.parse(data.join('\n')) : {}; } catch { payload = { raw: data.join('\n') }; }
    events.push({ type, data: payload });
  }
  return { events, rest };
}

async function currentToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Keeps one stream open and reconnects with backoff. After a reconnect it emits `resync` so the
 * screens refetch whatever changed while the stream was down. Returns a function that stops it.
 */
export function connectLiveUpdates({ onEvent, fetchImpl = (...args) => fetch(...args), getToken = currentToken, wait = (ms, signal) => new Promise((resolve) => {
  const timer = setTimeout(resolve, ms);
  signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
}) } = {}) {
  const controller = new AbortController();
  const { signal } = controller;

  // Forwards the events of one open stream until it ends or the connection is stopped.
  async function readStream(body) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunk = await reader.read();
    while (!chunk.done && !signal.aborted) {
      buffer += decoder.decode(chunk.value, { stream: true });
      const parsed = parseSse(buffer);
      buffer = parsed.rest;
      parsed.events.filter((event) => event.type !== 'ready').forEach((event) => onEvent(event));
      chunk = await reader.read();
    }
  }

  // Opens the stream once; resolves true when it connected (and has since closed).
  async function connectOnce(resync) {
    const token = await getToken();
    if (!token) return false;
    const response = await fetchImpl(`${API_BASE}/live/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
      signal,
      cache: 'no-store',
    });
    if (!response.ok || !response.body) return false;
    if (resync) onEvent({ type: 'resync', data: {} });
    await readStream(response.body);
    return true;
  }

  async function run() {
    let retry = MIN_RETRY_MS;
    let connectedBefore = false;
    let active = !signal.aborted;
    while (active) {
      try {
        if (await connectOnce(connectedBefore)) {
          connectedBefore = true;
          retry = MIN_RETRY_MS;
        }
      } catch {
        // Network error or aborted: fall through to the retry wait.
      }
      if (!signal.aborted) {
        await wait(retry, signal);
        retry = Math.min(retry * 2, MAX_RETRY_MS);
      }
      active = !signal.aborted;
    }
  }

  void run();
  return () => controller.abort();
}
