import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/landing/sidebar.jsx';
import PageHeader from '../components/landing/pageHeader.jsx';
import { navigationItems } from '../components/landing/navigation.js';
import { apiClient, getApiErrorMessage } from '../services/apiClient.js';

const filters = [
  { id: 'all', label: 'Todos los logros' },
  { id: 'unlocked', label: 'Desbloqueados' },
  { id: 'locked', label: 'Bloqueados' },
];

function AchievementCard({ achievement }) {
  const unlocked = achievement.isUnlocked === true;
  const hidden = achievement.isAchHidden === true && !unlocked;
  const title = hidden ? 'Logro oculto' : achievement.achName;
  const description = hidden ? 'Secreto por descubrir.' : achievement.achDescription;
  const hasCounter = !hidden && Number.isInteger(achievement.targetValue) && achievement.targetValue > 0;
  const currentProgress = hasCounter ? Math.min(achievement.progress ?? 0, achievement.targetValue) : 0;

  return <article className={`border p-5 transition-colors ${unlocked ? 'border-gold bg-gold/10' : 'border-gold-dim bg-panel-deep/70'}`}>
    <div className="flex gap-4">
      <div aria-hidden="true" className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border font-display text-2xl ${unlocked ? 'border-gold bg-crimson/35 text-gold' : 'border-muted bg-muted/15 text-muted'}`}>
        {hidden ? '?' : achievement.achPicture ? <img src={achievement.achPicture} alt="" className="h-full w-full object-cover" /> : '✦'}
      </div>
      <div className="min-w-0">
        <h2 className={`font-display text-base ${unlocked ? 'text-parchment' : 'text-muted'}`}>{title}</h2>
        <p className={`mt-2 text-sm ${unlocked ? 'text-parchment/80' : 'text-muted'}`}>{description}</p>
      </div>
    </div>
    {hasCounter && <div className="mt-5">
      <p className={`text-xs ${unlocked ? 'text-parchment/80' : 'text-muted'}`}>{currentProgress} / {achievement.targetValue} {achievement.progressLabel}</p>
      <div className="mt-2 h-1 overflow-hidden bg-gold-dim/40"><div className="h-full bg-crimson" style={{ width: `${(currentProgress / achievement.targetValue) * 100}%` }} /></div>
    </div>}
    <p className={`mt-5 font-display text-xs uppercase tracking-wide ${unlocked ? 'text-gold' : 'text-muted'}`}>{unlocked ? 'Desbloqueado' : 'Bloqueado'}</p>
  </article>;
}

export default function AchievementsPage({ user, onLogout, message }) {
  const [state, setState] = useState({ loading: true, achievements: [], error: '' });
  const [filter, setFilter] = useState('all');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiClient.get('/user-achievements/me', { signal: controller.signal }).then(({ data }) => {
      if (!Array.isArray(data)) throw new Error('Respuesta inválida');
      setState({ loading: false, achievements: data, error: '' });
    }).catch((error) => {
      if (!controller.signal.aborted) setState({ loading: false, achievements: [], error: getApiErrorMessage(error, 'No se pudieron cargar los logros.') });
    });
    return () => controller.abort();
  }, [attempt, user.userId]);

  const unlockedCount = state.achievements.filter((achievement) => achievement.isUnlocked === true).length;
  const visibleAchievements = useMemo(() => state.achievements.filter((achievement) => {
    if (filter === 'unlocked') return achievement.isUnlocked === true;
    if (filter === 'locked') return achievement.isUnlocked !== true;
    return true;
  }), [filter, state.achievements]);

  return <div className="flex min-h-screen flex-col bg-void md:flex-row">
    <Sidebar navItems={navigationItems} />
    <main className="flex-1 px-6 py-8 md:px-10">
      <div className="page-enter mx-auto max-w-5xl">
        <div className="flex justify-end"><button type="button" onClick={onLogout} className="border border-gold-dim px-4 py-2 font-display text-xs uppercase text-gold hover:border-gold">Cerrar sesión</button></div>
        <PageHeader eyebrow="Registro II · Las reliquias" title="El Salón de las Hazañas" subtitle="Las conquistas del heredero, grabadas para la eternidad." />
        {message && <p role="alert" className="mt-4 text-error">{message}</p>}

        <section className="mt-6 border border-gold-dim bg-panel p-5" aria-label="Progreso de logros">
          <p className="font-display text-xs uppercase text-gold">Progreso de tu leyenda</p>
          {state.loading ? <p className="mt-3 text-muted">Cargando logros...</p> : <>
            <p className="mt-3 text-parchment">{unlockedCount} de {state.achievements.length} logros desbloqueados</p>
            <div className="mt-4 h-1.5 overflow-hidden bg-gold-dim/50" role="progressbar" aria-label="Progreso de logros" aria-valuemin="0" aria-valuemax={state.achievements.length} aria-valuenow={unlockedCount}>
              <div className="h-full bg-crimson transition-[width] duration-500" style={{ width: `${state.achievements.length ? (unlockedCount / state.achievements.length) * 100 : 0}%` }} />
            </div>
          </>}
        </section>

        {state.error ? <section className="mt-6 border border-error bg-panel p-5"><p role="alert" className="text-error">{state.error}</p><button type="button" onClick={() => { setState((current) => ({ ...current, loading: true, error: '' })); setAttempt((value) => value + 1); }} className="mt-3 text-gold underline">Reintentar</button></section> : <>
          <div className="mt-6 flex gap-5 overflow-x-auto border-b border-gold-dim" role="tablist" aria-label="Filtrar logros">
            {filters.map((item) => <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)} className={`shrink-0 border-b-2 px-0 pb-3 font-display text-xs uppercase tracking-wide ${filter === item.id ? 'border-crimson text-parchment' : 'border-transparent text-muted hover:text-parchment'}`}>{item.label}</button>)}
          </div>
          {!state.loading && <div key={filter} className="achievement-list-enter mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleAchievements.map((achievement) => <AchievementCard key={achievement.achId} achievement={achievement} />)}</div>}
          {!state.loading && visibleAchievements.length === 0 && <p className="mt-6 text-muted">No hay logros en esta categoría.</p>}
        </>}
      </div>
    </main>
  </div>;
}
