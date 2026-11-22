import { createContext, useContext, useEffect, useRef } from 'react';

// Without a provider (tests, public pages) subscribing is a no-op.
export const LiveUpdatesContext = createContext({ subscribe: () => () => {} });

/**
 * Calls `refresh` when the backend reports a change of one of `types` for this player, and after a
 * reconnect (`resync`), so the screen shows what the game just saved.
 */
export function useLiveRefresh(types, refresh) {
  const { subscribe } = useContext(LiveUpdatesContext);
  const latest = useRef(refresh);
  useEffect(() => { latest.current = refresh; });
  const key = types.join(',');
  useEffect(() => subscribe((event) => {
    if (event.type === 'resync' || key.split(',').includes(event.type)) latest.current(event);
  }), [subscribe, key]);
}
