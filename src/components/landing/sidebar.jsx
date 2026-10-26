import NavItem from './navItem.jsx';

function Sidebar({ navItems }) {
  return (
    <aside className="flex w-full flex-col border-b border-gold-dim bg-panel-deep px-4 py-6 md:min-h-screen md:w-64 md:shrink-0 md:border-r md:border-b-0">
      <div className="text-center">
        <span className="text-2xl text-gold">♛</span>
        <p className="mt-3 font-display text-lg uppercase text-parchment">Echoes of</p>
        <p className="font-display text-2xl uppercase text-gold">The Throne</p>
      </div>

      <hr className="my-6 border-gold-dim" />

      <nav>
        <ul className="flex gap-1 overflow-x-auto md:flex-col">
          {navItems.map((item) => (
            <NavItem key={item.label} {...item} />
          ))}
        </ul>
      </nav>

      <div className="mt-auto hidden pt-6 md:block">
        <hr className="mb-4 border-gold-dim" />
        <p className="font-display text-xs uppercase text-muted">El legado permanece</p>
        <p className="font-display text-xs uppercase text-muted">Foráneos Studios</p>
      </div>
    </aside>
  );
}

export default Sidebar;
