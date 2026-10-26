import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../src/App.jsx';
import { restoreUser, logoutUser } from '../src/services/authService.js';
import { AUTH_REQUIRED_EVENT } from '../src/services/apiClient.js';

vi.mock('../src/services/authService.js', () => ({
  takeConfirmationResult: () => null, verifyConfirmation: vi.fn(), restoreUser: vi.fn(), logoutUser: vi.fn(),
  subscribeToAuthChanges: () => () => {},
}));
vi.mock('../src/services/apiClient.js', () => ({ AUTH_REQUIRED_EVENT: 'auth-required', getApiErrorMessage: () => 'Error de sesión' }));
vi.mock('../src/pages/landingPage.jsx', () => ({ default: ({ user, onLogout }) => <button onClick={onLogout}>Salir {user.username}</button> }));
vi.mock('../src/pages/loginPage.jsx', () => ({ default: ({ onForgot, onLogin, onRegister }) => <><button onClick={onForgot}>Recuperar</button><button onClick={() => onLogin({ username: 'hero' })}>Entrar</button><button onClick={onRegister}>Registrar</button></> }));
vi.mock('../src/pages/registerPage.jsx', () => ({ default: ({ onOpenLogin }) => <button onClick={onOpenLogin}>Login</button> }));
vi.mock('../src/pages/passwordPage.jsx', () => ({ default: ({ onLogin }) => <button onClick={onLogin}>Volver</button> }));
vi.mock('../src/pages/confirmationPage.jsx', () => ({ default: () => <p>Confirmación</p> }));

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it('restores the profile and closes the session', async () => {
  restoreUser.mockResolvedValue({ username: 'hero' });
  logoutUser.mockResolvedValue();
  render(<App />);
  fireEvent.click(await screen.findByText('Salir hero'));
  expect(await screen.findByText('Entrar')).toBeTruthy();
  expect(logoutUser).toHaveBeenCalledOnce();
});

it('navigates from registration to recovery and back', async () => {
  restoreUser.mockResolvedValue(null);
  render(<App />);
  fireEvent.click(await screen.findByText('Login'));
  fireEvent.click(screen.getByText('Recuperar'));
  fireEvent.click(screen.getByText('Volver'));
  fireEvent.click(screen.getByText('Entrar'));
  expect(screen.getByText('Salir hero')).toBeTruthy();
  window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
  expect(await screen.findByText('Entrar')).toBeTruthy();
});

it('offers login when session restoration fails', async () => {
  restoreUser.mockRejectedValue(new Error('offline'));
  render(<App />);
  expect(await screen.findByText('Entrar')).toBeTruthy();
});
