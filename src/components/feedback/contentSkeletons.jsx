function Skeleton({ className = '' }) {
  return <span aria-hidden="true" className={`skeleton-block ${className}`} />;
}

function LoadingLabel({ label }) {
  return <p className="sr-only" role="status" aria-live="polite">{label}</p>;
}

export function AchievementCardsSkeleton({ count = 6 }) {
  return <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
    <LoadingLabel label="Cargando logros..." />
    {Array.from({ length: count }, (_, index) => <article key={index} className="border border-gold-dim bg-panel-deep/70 p-5" aria-hidden="true"><div className="flex gap-4"><Skeleton className="h-14 w-14 shrink-0" /><div className="flex-1 space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /></div></div><Skeleton className="mt-5 h-3 w-24" /></article>)}
  </div>;
}

export function AchievementProgressSkeleton() {
  return <div className="mt-3 space-y-4" aria-busy="true"><LoadingLabel label="Cargando progreso de logros..." /><Skeleton className="h-4 w-52" /><Skeleton className="h-1.5 w-full" /></div>;
}

export function ProfileAchievementsSkeleton() {
  return <div className="mt-5 space-y-4 border-y border-gold-dim py-4" aria-busy="true"><LoadingLabel label="Cargando logros obtenidos..." />
    {Array.from({ length: 3 }, (_, index) => <div key={index} className="flex items-center gap-4" aria-hidden="true"><Skeleton className="h-12 w-12 shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/5" /><Skeleton className="h-3 w-4/5" /></div><Skeleton className="h-3 w-16" /></div>)}
  </div>;
}

export function ForumThreadsSkeleton({ count = 5 }) {
  return <section className="mt-6 grid gap-3" aria-busy="true"><LoadingLabel label="Cargando conversaciones..." />
    {Array.from({ length: count }, (_, index) => <article key={index} className="border border-gold-dim bg-panel p-5" aria-hidden="true"><Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-5 w-3/4" /><Skeleton className="mt-3 h-3 w-28" /></article>)}
  </section>;
}

export function ForumThreadSkeleton() {
  return <div className="space-y-6" aria-busy="true"><LoadingLabel label="Cargando conversación..." />
    <article className="border border-gold-dim bg-panel p-6" aria-hidden="true"><Skeleton className="h-3 w-32" /><Skeleton className="mt-3 h-7 w-3/4" /><Skeleton className="mt-5 h-4 w-full" /><Skeleton className="mt-2 h-4 w-4/5" /></article>
    <section className="space-y-3" aria-hidden="true">{Array.from({ length: 3 }, (_, index) => <article key={index} className="border border-gold-dim bg-panel p-4"><Skeleton className="h-3 w-28" /><Skeleton className="mt-3 h-4 w-full" /><Skeleton className="mt-2 h-4 w-3/5" /></article>)}</section>
  </div>;
}
