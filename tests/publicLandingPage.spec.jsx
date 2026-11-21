import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PublicLandingPage from '../src/pages/publicLandingPage.jsx';
import { PwaInstallContext } from '../src/components/pwa/pwaInstallContext.js';

afterEach(cleanup);

function renderLanding(install = { canInstall: false, installing: false, install: vi.fn() }) {
  render(<PwaInstallContext.Provider value={install}><MemoryRouter><PublicLandingPage /></MemoryRouter></PwaInstallContext.Provider>);
  return install;
}

it('presents the game and sends visitors to create an account or sign in', () => {
  renderLanding();
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('El trono está vacío.');
  expect(screen.getAllByRole('link', { name: 'Iniciar sesión' })[0].getAttribute('href')).toBe('/login');
  const signUp = screen.getAllByRole('link', { name: /Crear cuenta|Comenzar el viaje/ });
  expect(signUp.length).toBeGreaterThanOrEqual(2);
  signUp.forEach((link) => expect(link.getAttribute('href')).toBe('/register'));
});

it('navigates to every section of the page', () => {
  renderLanding();
  const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
  ['#mundo', '#proceso', '#comunidad'].forEach((anchor) => {
    expect(nav.querySelector(`a[href="${anchor}"]`)).toBeTruthy();
    expect(document.querySelector(anchor)).toBeTruthy();
  });
  expect(document.querySelector('#inicio')).toBeTruthy();
});

it('describes the world, the process and shows the concept art with alternative text', () => {
  renderLanding();
  expect(screen.getByText('Un reino que recuerda')).toBeTruthy();
  expect(screen.getByText('Concepción')).toBeTruthy();
  expect(screen.getByAltText('Concepto del Heredero transformado')).toBeTruthy();
  expect(screen.getByAltText('Concepto de la bestia de las grietas')).toBeTruthy();
  for (const image of document.querySelectorAll('img')) expect(image.hasAttribute('alt')).toBe(true);
});

it('only offers installation when the browser allows it', () => {
  renderLanding();
  expect(screen.queryByRole('button', { name: 'Instalar app' })).toBeNull();
  cleanup();

  const install = renderLanding({ canInstall: true, installing: false, install: vi.fn() });
  fireEvent.click(screen.getByRole('button', { name: 'Instalar app' }));
  expect(install.install).toHaveBeenCalledOnce();
  cleanup();

  renderLanding({ canInstall: true, installing: true, install: vi.fn() });
  const busy = screen.getByRole('button', { name: 'Abriendo…' });
  expect(busy.disabled).toBe(true);
});
