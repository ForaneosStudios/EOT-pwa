import { useState } from 'react';
import NavItem from './navItem.jsx';
import { usePwaInstall } from '../pwa/pwaInstallContext.js';

function Brand({ collapsed = false, mobile = false }) {
  return <div className={mobile ? 'flex items-center gap-2' : 'text-center'}><span className="text-2xl text-gold">♛</span>{mobile ? <span className="font-display text-sm uppercase text-parchment">EOT</span> : !collapsed && <><p className="mt-3 font-display text-lg uppercase text-parchment">Echoes of</p><p className="font-display text-2xl uppercase text-gold">The Throne</p></>}</div>;
}

function Sidebar({ navItems }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { canInstall, install, installing } = usePwaInstall();
  const closeMobileMenu = () => setMobileOpen(false);

  return <>
    <aside className={`sticky top-0 z-40 flex w-full items-center border-b border-gold-dim bg-panel-deep px-4 py-3 md:static md:min-h-screen md:flex-col md:items-stretch md:border-r md:border-b-0 md:px-4 md:py-6 md:transition-[width] md:duration-200 ${collapsed ? 'md:w-20' : 'md:w-64'} md:shrink-0`}>
      <button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expandir navegación' : 'Contraer navegación'} className="absolute -right-4 top-1/2 z-30 hidden -translate-y-1/2 rounded-full border border-gold-dim bg-panel-deep px-2 py-2 text-xs text-gold transition-colors hover:border-gold md:block">{collapsed ? '→' : '←'}</button>
      <div className="md:hidden"><Brand mobile /></div>
      <div className="hidden md:block"><Brand collapsed={collapsed} /></div>
      <button type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación" aria-expanded={mobileOpen} className="ml-auto border border-gold-dim px-3 py-2 text-gold md:hidden"><span className="text-lg" aria-hidden="true">☰</span></button>
      <hr className="my-6 hidden border-gold-dim md:block" />
      <nav className="hidden md:block"><ul className="flex gap-1 md:flex-col">{navItems.map((item) => <NavItem key={item.label} {...item} collapsed={collapsed} />)}</ul></nav>
      {collapsed && canInstall && <button type="button" title="Instalar PWA" aria-label="Instalar PWA" disabled={installing} onClick={install} className="mt-4 hidden border border-gold px-2 py-2 text-gold disabled:opacity-60 md:block">↓</button>}
      {!collapsed && <div className="mt-auto hidden pt-6 md:block"><hr className="mb-4 border-gold-dim" />{canInstall && <button type="button" disabled={installing} onClick={install} className="mb-4 w-full border border-gold px-3 py-2 font-display text-xs uppercase text-gold transition-colors hover:bg-gold/10 disabled:opacity-60">{installing ? 'Abriendo...' : 'Instalar PWA'}</button>}<p className="font-display text-xs uppercase text-muted">El legado permanece</p><p className="font-display text-xs uppercase text-muted">Foráneos Studios</p></div>}
    </aside>
    {mobileOpen && <div className="modal-backdrop fixed inset-0 z-50 bg-void p-6 md:hidden" role="dialog" aria-modal="true" aria-label="Navegación principal"><div className="modal-panel flex min-h-full flex-col"><div className="flex items-center justify-between border-b border-gold-dim pb-5"><Brand mobile /><button type="button" onClick={closeMobileMenu} aria-label="Cerrar navegación" className="border border-gold-dim px-3 py-2 text-gold">×</button></div><nav className="mt-8"><ul className="grid gap-2">{navItems.map((item) => <NavItem key={item.label} {...item} onNavigate={closeMobileMenu} />)}</ul></nav><div className="mt-auto border-t border-gold-dim pt-5">{canInstall && <button type="button" disabled={installing} onClick={install} className="mb-4 w-full border border-gold px-4 py-3 font-display text-xs uppercase text-gold disabled:opacity-60">{installing ? 'Abriendo...' : 'Instalar PWA'}</button>}<p className="font-display text-xs uppercase text-muted">El legado permanece · Foráneos Studios</p></div></div></div>}
  </>;
}

export default Sidebar;
