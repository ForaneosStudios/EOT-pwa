import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../src/components/landing/sidebar.jsx';
import { navigationItems } from '../src/components/landing/navigation.js';
import { AuthContext } from '../src/app/auth/authContext.js';
import { PwaInstallContext } from '../src/components/pwa/pwaInstallContext.js';

afterEach(cleanup);

function renderSidebar({ role, install = { canInstall: false, installing: false, install: vi.fn() }, path = '/forum' } = {}) {
  const auth = role ? { user: { role } } : null;
  render(
    <AuthContext.Provider value={auth}>
      <PwaInstallContext.Provider value={install}>
        <MemoryRouter initialEntries={[path]}><Sidebar navItems={navigationItems} /></MemoryRouter>
      </PwaInstallContext.Provider>
    </AuthContext.Provider>,
  );
  return install;
}

const desktopNav = () => within(document.querySelector('nav'));

it('lists the player sections and hides administration from regular players', () => {
  renderSidebar({ role: 'USER' });
  ['Inicio', 'Logros', 'Crónicas', 'El Archivo', 'Foro', 'Mi perfil'].forEach((name) => {
    expect(desktopNav().getByRole('link', { name: new RegExp(name) })).toBeTruthy();
  });
  expect(desktopNav().queryByRole('link', { name: /Administración/ })).toBeNull();
});

it('shows administration to admins only', () => {
  renderSidebar({ role: 'ADMIN' });
  expect(desktopNav().getByRole('link', { name: /Administración/ }).getAttribute('href')).toBe('/admin');
});

it('works without an authentication provider', () => {
  renderSidebar();
  expect(desktopNav().queryByRole('link', { name: /Administración/ })).toBeNull();
  expect(desktopNav().getByRole('link', { name: /Inicio/ }).getAttribute('href')).toBe('/app');
});

it('marks the current page', () => {
  renderSidebar({ path: '/forum' });
  expect(desktopNav().getByRole('link', { name: /Foro/ }).getAttribute('aria-current')).toBe('page');
  expect(desktopNav().getByRole('link', { name: /Logros/ }).getAttribute('aria-current')).toBeNull();
});

it('collapses and expands the desktop navigation', () => {
  renderSidebar();
  fireEvent.click(screen.getByRole('button', { name: 'Contraer navegación' }));
  expect(screen.getByRole('button', { name: 'Expandir navegación' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Expandir navegación' }));
  expect(screen.getByRole('button', { name: 'Contraer navegación' })).toBeTruthy();
});

it('opens and closes the mobile menu', () => {
  renderSidebar({ role: 'USER' });
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir navegación' }));
  const menu = screen.getByRole('dialog', { name: 'Navegación principal' });
  expect(within(menu).getByRole('link', { name: /Foro/ })).toBeTruthy();
  fireEvent.click(within(menu).getByRole('button', { name: 'Cerrar navegación' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('closes the mobile menu after choosing a section', () => {
  renderSidebar();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir navegación' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: /Logros/ }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('offers to install the app only when the browser allows it', () => {
  renderSidebar();
  expect(screen.queryByRole('button', { name: /Instalar/ })).toBeNull();
  cleanup();

  const install = renderSidebar({ install: { canInstall: true, installing: false, install: vi.fn() } });
  fireEvent.click(screen.getAllByRole('button', { name: /Instalar/ })[0]);
  expect(install.install).toHaveBeenCalledOnce();
  cleanup();

  renderSidebar({ install: { canInstall: true, installing: true, install: vi.fn() } });
  screen.getAllByRole('button', { name: /Instalar|Instalando|Abriendo/ }).forEach((button) => expect(button.disabled).toBe(true));
});

it('keeps the install shortcut when the sidebar is collapsed', () => {
  const install = renderSidebar({ install: { canInstall: true, installing: false, install: vi.fn() } });
  fireEvent.click(screen.getByRole('button', { name: 'Contraer navegación' }));
  fireEvent.click(screen.getByRole('button', { name: 'Instalar PWA' }));
  expect(install.install).toHaveBeenCalledOnce();
});
