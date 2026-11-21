import { useEffect } from 'react';
import { useAuth } from '../auth/authContext.js';
import { outbox, startOutbox } from '../../services/offline/index.js';
import { useOutboxSynced } from '../../hooks/useOutbox.js';

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

  useOutboxSynced(({ item, data }) => {
    // A profile picture changed while offline updates the visible profile once the server answers,
    // including when a newer change from another device won (data is then the current profile).
    if (item?.meta?.kind === 'profile:avatar' && data?.userId === userId) setUser(data);
  });

  return children;
}
