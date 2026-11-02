export default function LoadingIndicator({ label = 'Cargando contenido...' }) {
  return <div className="flex min-h-[16rem] items-center justify-center" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-3 text-center text-gold">
      <span className="loading-sigil" aria-hidden="true">✦</span>
      <span className="font-display text-xs uppercase tracking-widest">{label}</span>
    </div>
  </div>;
}
