import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient.js';
import { useLiveRefresh } from '../../app/live/liveContext.js';
import { formatRunTime } from '../../services/runTime.js';
import UserAvatar from '../profile/UserAvatar.jsx';

const validEntry = (entry) => entry && typeof entry.username === 'string' && Number.isFinite(entry.bestTimeMs);

// Player's best run and the global ranking. Both refresh by themselves when the game saves a record.
export default function RecordsPanel({ user }) {
  const [state, setState] = useState({ loading: true, best: null, ranking: [], error: false });
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  useLiveRefresh(['record', 'leaderboard'], refresh);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      apiClient.get('/time-records/me', { signal: controller.signal }),
      apiClient.get('/leaderboard', { params: { limit: 10 }, signal: controller.signal }),
    ]).then(([record, leaderboard]) => {
      const ranking = Array.isArray(leaderboard.data) ? leaderboard.data.filter(validEntry) : [];
      setState({ loading: false, best: Number.isFinite(record.data?.timeMs) ? record.data.timeMs : null, ranking, error: false });
    }).catch(() => {
      if (!controller.signal.aborted) setState((current) => ({ ...current, loading: false, error: true }));
    });
    return () => controller.abort();
  }, [version, user?.userId]);

  return <section aria-labelledby="records-title" className="mt-10 border border-gold-dim bg-panel p-6">
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h2 id="records-title" className="font-display text-lg uppercase text-parchment">Récords del reino</h2>
      <p className="text-xs text-muted">Se actualiza solo al terminar una partida.</p>
    </div>
    <div className="mt-4 border border-gold-dim/60 bg-panel-deep/60 p-4">
      <p className="font-display text-xs uppercase tracking-wide text-gold">Tu mejor tiempo</p>
      <p className="mt-1 font-display text-2xl text-parchment" aria-live="polite">{state.loading ? '…' : state.best ? formatRunTime(state.best) : 'Aún sin récord'}</p>
    </div>
    {state.error && <p role="alert" className="mt-4 text-sm text-error">No se pudieron cargar los récords.</p>}
    {!state.loading && !state.error && (state.ranking.length === 0
      ? <p className="mt-4 text-sm text-muted">Nadie ha completado el recorrido todavía.</p>
      : <ol className="mt-4 divide-y divide-gold-dim/40" aria-label="Mejores tiempos">
        {state.ranking.map((entry) => {
          const mine = entry.username === user?.username;
          return <li key={`${entry.rank}-${entry.username}`} className={`flex items-center gap-3 py-2 text-sm ${mine ? 'text-gold' : 'text-parchment'}`}>
            <span className="w-6 text-right font-display text-muted">{entry.rank}</span>
            <UserAvatar src={entry.profilePicture} username={entry.username} className="h-7 w-7" />
            <span className="min-w-0 flex-1 truncate">{entry.username}{mine && ' (tú)'}</span>
            <span className="font-display tabular-nums">{formatRunTime(entry.bestTimeMs)}</span>
          </li>;
        })}
      </ol>)}
  </section>;
}
