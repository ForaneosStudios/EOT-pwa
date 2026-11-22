import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../auth/authContext.js';
import { connectLiveUpdates } from '../../services/liveUpdates.js';
import { LiveUpdatesContext } from './liveContext.js';

// One live stream per signed-in player, shared by every screen. Closed on logout.
export function LiveUpdatesProvider({ children, connect = connectLiveUpdates }) {
  const { user } = useAuth();
  const listeners = useRef(new Set());
  const userId = user?.userId;

  useEffect(() => {
    if (!userId) return undefined;
    return connect({ onEvent: (event) => listeners.current.forEach((listener) => listener(event)) });
  }, [userId, connect]);

  const subscribe = useCallback((listener) => {
    listeners.current.add(listener);
    return () => listeners.current.delete(listener);
  }, []);

  const value = useMemo(() => ({ subscribe }), [subscribe]);
  return <LiveUpdatesContext.Provider value={value}>{children}</LiveUpdatesContext.Provider>;
}
