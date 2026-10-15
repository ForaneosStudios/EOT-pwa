function ProgressBar({ label, current, total }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between font-display text-xs uppercase text-muted">
        <span>{label}</span>
        <span>
          {current} / {total}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full bg-gold-dim/40">
        <div className="h-full bg-crimson" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export default ProgressBar;
