function SectionCard({ icon, title, description }) {
  return (
    <a
      href="#"
      className="flex gap-5 border border-gold-dim bg-panel p-6 transition-colors hover:border-gold"
    >
      <span className="w-6 shrink-0 text-center text-2xl text-gold">{icon}</span>
      <div>
        <h3 className="font-display text-lg uppercase text-parchment">{title}</h3>
        <p className="mt-2 font-display text-xs uppercase text-muted">{description}</p>
        <p className="mt-4 font-display text-xs uppercase text-gold">Explorar →</p>
      </div>
    </a>
  );
}

export default SectionCard;
