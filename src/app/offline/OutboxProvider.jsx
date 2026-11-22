import { useEffect } from 'react';
import { useAuth } from '../auth/authContext.js';
import { outbox, startOutbox } from '../../services/offline/index.js';
import { useOutboxSynced } from '../../hooks/useOutbox.js';
import { prefetchOnce } from '../../services/offline/prefetch.js';

// Ties the offline outbox to the signed-in account: only that account's queued requests are
// sent, and another account's leftovers are removed from the device when someone else signs in.
export function OutboxProvider({ children }) {
  const { user, setUser } = useAuth();
  const userId = user?.userId ?? null;

  useEffect(() => startOutbox(), []);

  useEffect(() => {
    // setOwner handles its own storage errors; this only prevents an unhandled rejection.
    outbox.setOwner(userId).catch(() => {});
  }, [userId]);

  // Load every screen's data right after signing in and whenever the connection comes back, so it
  // is already saved on the device if the connection drops later.
  useEffect(() => {
    if (!user) return undefined;
    const prefetch = () => { void prefetchOnce(user); };
    prefetch();
    window.addEventListener('online', prefetch);
    return () => window.removeEventListener('online', prefetch);
  }, [user]);

  useOutboxSynced(({ item, data }) => {
    // A profile picture changed while offline updates the visible profile once the server answers,
    // including when a newer change from another device won (data is then the current profile).
    if (item?.meta?.kind === 'profile:avatar' && data?.userId === userId) setUser(data);
  });

  return children;
}
