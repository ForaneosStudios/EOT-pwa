import { NavLink } from 'react-router-dom';

function NavItem({ icon, label, to }) {
  const common = 'flex shrink-0 items-center gap-4 whitespace-nowrap border px-4 py-3 font-display text-sm uppercase tracking-wide transition-colors';
  const contents = <><span className="w-4 text-center text-gold" aria-hidden="true">{icon}</span>{label}</>;

  return (
    <li>
      {to ? <NavLink to={to} end className={({ isActive }) => `${common} ${isActive ? 'border-crimson bg-crimson/40 text-parchment' : 'border-transparent text-muted hover:text-parchment'}`}>{contents}</NavLink>
        : <span aria-disabled="true" className={`${common} border-transparent text-muted`}>{contents}</span>}
    </li>
  );
}

export default NavItem;
