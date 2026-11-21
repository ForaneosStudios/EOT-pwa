import { useEffect, useEffectEvent, useSyncExternalStore } from 'react';
import { outbox, OUTBOX_SYNCED_EVENT } from '../services/offline/index.js';

export function useOutbox() {
  return useSyncExternalStore(outbox.subscribe, outbox.getSnapshot, outbox.getSnapshot);
}

// Runs the handler whenever a queued mutation is confirmed by the server, e.g. to reload a page.
export function useOutboxSynced(handler) {
  const onSynced = useEffectEvent((event) => handler(event.detail));
  useEffect(() => {
    window.addEventListener(OUTBOX_SYNCED_EVENT, onSynced);
    return () => window.removeEventListener(OUTBOX_SYNCED_EVENT, onSynced);
  }, []);
}
