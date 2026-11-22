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
vi.mock('../src/pages/resetPasswordPage.jsx', () => ({ default: ({ onDone, onRequestNew }) => <><button onClick={() => onDone(true)}>Listo</button><button onClick={onRequestNew}>Pedir otro</button></> }));
vi.mock('../src/pages/profilePage.jsx', () => ({ default: ({ user }) => <p>Perfil {user.username}</p> }));
vi.mock('../src/pages/achievementsPage.jsx', () => ({ default: () => <p>Logros</p> }));
vi.mock('../src/pages/publicLandingPage.jsx', () => ({ default: () => <p>Portada pública</p> }));

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

it('redirects unknown routes to the public landing page', () => {
  renderRouter('/unknown', { user: { role: 'USER' } });
  expect(screen.getByText('Portada pública')).toBeTruthy();
});

it('renders the public landing page without a session', () => {
  renderRouter('/');
  expect(screen.getByText('Portada pública')).toBeTruthy();
});

it('requires a session for the profile route', () => {
  renderRouter('/profile');
  expect(screen.getByText('Entrar')).toBeTruthy();
});

it('requires a session for the achievements route', () => {
  renderRouter('/achievements');
  expect(screen.getByText('Entrar')).toBeTruthy();
});

it('requires a session for chronicles and archive routes', () => {
  renderRouter('/chronicles');
  expect(screen.getByText('Entrar')).toBeTruthy();
  cleanup();
  renderRouter('/archive');
  expect(screen.getByText('Entrar')).toBeTruthy();
});

it('renders the authenticated user profile', () => {
  renderRouter('/profile', { user: { username: 'Alma', role: 'USER' } });
  expect(screen.getByText('Perfil Alma')).toBeTruthy();
});

it('sends the user to login with a notice after the password was reset, or back to the forgot page', () => {
  const auth = renderRouter('/reset-password');
  fireEvent.click(screen.getByText('Listo'));
  expect(auth.setMessage).toHaveBeenCalledWith(expect.stringMatching(/sesiones se cerraron/));
  expect(screen.getByText('Entrar')).toBeTruthy();
  cleanup();
  renderRouter('/reset-password');
  fireEvent.click(screen.getByText('Pedir otro'));
  expect(screen.getByText('Recuperación')).toBeTruthy();
});
