function NavItem({ icon, label, isActive = false }) {
  const activeStyles = isActive
    ? 'border-crimson bg-crimson/40 text-parchment'
    : 'border-transparent text-muted hover:text-parchment';

  return (
    <li>
      <a
        href="#"
        className={`flex shrink-0 items-center gap-4 whitespace-nowrap border px-4 py-3 font-display text-sm uppercase tracking-wide transition-colors ${activeStyles}`}
      >
        <span className="w-4 text-center text-gold">{icon}</span>
        {label}
      </a>
    </li>
  );
}

export default NavItem;
