import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../src/app/auth/authContext.js';
import AppRouter from '../src/app/router/AppRouter.jsx';

vi.mock('../src/pages/landingPage.jsx', () => ({ default: () => <p>Inicio</p> }));
vi.mock('../src/pages/loginPage.jsx', () => ({ default: ({ onLogin }) => <button onClick={() => onLogin({ role: 'USER' })}>Entrar</button> }));
vi.mock('../src/pages/registerPage.jsx', () => ({ default: ({ onLogin }) => <button onClick={() => onLogin({ role: 'USER' })}>Registrar</button> }));
vi.mock('../src/pages/confirmationPage.jsx', () => ({ default: ({ onLogin, status }) => <button onClick={onLogin}>Confirmación {status}</button> }));
vi.mock('../src/pages/passwordPage.jsx', () => ({ default: ({ onLogin, recovery }) => <button onClick={onLogin}>{recovery ? 'Nueva contraseña' : 'Recuperación'}</button> }));

afterEach(cleanup);

function renderRouter(path, overrides = {}) {
  const auth = { user: null, loading: false, message: '', setMessage: vi.fn(), setUser: vi.fn(), logout: vi.fn(), callbackStatus: 'success', ...overrides };
  render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={[path]}><AppRouter /></MemoryRouter></AuthContext.Provider>);
  return auth;
}

it('renders confirmation and navigates to login', () => {
  const auth = renderRouter('/auth/confirm');
  fireEvent.click(screen.getByText('Confirmación success'));
  expect(screen.getByText('Entrar')).toBeTruthy();
  expect(auth.setMessage).toHaveBeenCalledWith('');
});

it('renders the recovery callback and navigates to login', () => {
  renderRouter('/auth/reset-password');
  fireEvent.click(screen.getByText('Nueva contraseña'));
  expect(screen.getByText('Entrar')).toBeTruthy();
});

it('updates the profile after registration', () => {
  const auth = renderRouter('/register');
  fireEvent.click(screen.getByText('Registrar'));
  expect(auth.setUser).toHaveBeenCalledWith({ role: 'USER' });
});

it('redirects unknown routes to the authenticated home', () => {
  renderRouter('/unknown', { user: { role: 'USER' } });
  expect(screen.getByText('Inicio')).toBeTruthy();
});
