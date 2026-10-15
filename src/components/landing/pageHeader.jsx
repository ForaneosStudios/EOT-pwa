function PageHeader({ eyebrow, title, subtitle }) {
  return (
    <header className="border-b border-gold-dim pb-6">
      <p className="font-display text-xs uppercase tracking-wide text-gold">{eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl uppercase text-parchment md:text-4xl">{title}</h1>
      <p className="mt-3 font-display text-sm uppercase text-muted">{subtitle}</p>
    </header>
  );
}

export default PageHeader;
