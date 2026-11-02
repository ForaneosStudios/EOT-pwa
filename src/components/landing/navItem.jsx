import { NavLink } from 'react-router-dom';

function NavItem({ icon, label, to, collapsed = false, onNavigate }) {
  const common = `flex shrink-0 items-center whitespace-nowrap border py-3 font-display text-sm uppercase tracking-wide transition-colors ${collapsed ? 'justify-center px-3' : 'gap-4 px-4'}`;
  const contents = <><span className="w-6 text-center text-lg leading-none text-gold" aria-hidden="true">{icon}</span>{!collapsed && label}</>;

  return (
    <li>
      {to ? <NavLink to={to} end onClick={onNavigate} title={collapsed ? label : undefined} aria-label={label} className={({ isActive }) => `${common} ${isActive ? 'border-crimson bg-crimson/40 text-parchment' : 'border-transparent text-muted hover:text-parchment'}`}>{contents}</NavLink>
        : <span title={collapsed ? label : undefined} aria-label={label} aria-disabled="true" className={`${common} border-transparent text-muted`}>{contents}</span>}
    </li>
  );
}

export default NavItem;
