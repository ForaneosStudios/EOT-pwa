import { apiClient } from '../apiClient.js';
import { createOutbox } from './outbox.js';
import { createDefaultStorage } from './storage.js';
import { serverNow } from './serverClock.js';

export { OUTBOX_SYNCED_EVENT } from './outbox.js';

// The API base URL ends in /api/v1; the public health endpoint lives at the server root.
export function healthUrl(baseURL = apiClient.defaults?.baseURL || '') {
  const base = new URL(baseURL, globalThis.location?.origin || 'http://localhost');
  return `${base.origin}${base.pathname.replace(/\/api\/v\d+\/?$/, '')}/actuator/health`;
}

// navigator.onLine only says there is a network interface (a captive portal also counts),
// so check that the API itself answers before replaying queued requests.
export async function probeApi() {
  try {
    const response = await apiClient.get(healthUrl(), { baseURL: '', timeout: 45_000 });
    return response.status < 500;
  } catch (error) {
    return Boolean(error?.response && error.response.status < 500);
  }
}

function createChannel() {
  try {
    return typeof BroadcastChannel === 'function' ? new BroadcastChannel('eot-outbox') : null;
  } catch {
    return null;
  }
}

const channel = createChannel();

export const outbox = createOutbox({
  request: (config) => apiClient.request(config),
  storage: createDefaultStorage(),
  probe: probeApi,
  channel,
  intentClock: serverNow,
});

let started = false;

// Wires browser signals once. Called by OutboxProvider, never at import time.
export function startOutbox() {
  if (started || typeof window === 'undefined') return () => {};
  started = true;
  // drain/refresh handle their own errors; the catch only guards against unhandled rejections.
  const drain = () => { outbox.drain().catch(() => {}); };
  const onVisible = () => { if (document.visibilityState === 'visible') drain(); };
  const onMessage = () => { outbox.refresh().catch(() => {}); };
  window.addEventListener('online', drain);
  document.addEventListener('visibilitychange', onVisible);
  channel?.addEventListener('message', onMessage);
  return () => {
    started = false;
    window.removeEventListener('online', drain);
    document.removeEventListener('visibilitychange', onVisible);
    channel?.removeEventListener('message', onMessage);
  };
}

export const sendMutation = (mutation) => outbox.send(mutation);
