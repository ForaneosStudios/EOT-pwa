import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../src/pages/loginPage.jsx';
import { loginUser } from '../src/services/authService.js';

vi.mock('../src/services/authService.js', () => ({ loginUser: vi.fn() }));
vi.mock('../src/services/apiClient.js', () => ({ getApiErrorMessage: (error, fallback) => error?.message || fallback }));

function renderLogin(props = {}) {
  const handlers = { onLogin: vi.fn(), onRegister: vi.fn(), onForgot: vi.fn() };
  render(<MemoryRouter><LoginPage {...handlers} {...props} /></MemoryRouter>);
  return handlers;
}

const fill = (email, password) => {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } });
};

beforeEach(() => vi.resetAllMocks());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('shows what is missing and does not call the API for an empty or invalid form', () => {
  renderLogin();
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(screen.getByText('Introduce un correo válido.')).toBeTruthy();
  expect(screen.getByText('La contraseña es obligatoria.')).toBeTruthy();

  fill('no-es-correo', 'Secreta1');
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(screen.getByText('Introduce un correo válido.')).toBeTruthy();
  expect(loginUser).not.toHaveBeenCalled();
});

it('signs in with valid credentials and hands the profile to the app', async () => {
  loginUser.mockResolvedValue({ userId: 'u1', username: 'Alma' });
  const { onLogin } = renderLogin();
  fill('alma@example.com', 'Secreta1');
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(await screen.findByRole('button', { name: 'Iniciando sesión...' })).toBeTruthy();
  await waitFor(() => expect(onLogin).toHaveBeenCalledWith({ userId: 'u1', username: 'Alma' }));
  expect(loginUser).toHaveBeenCalledWith({ email: 'alma@example.com', password: 'Secreta1' });
  expect(screen.getByRole('button', { name: 'Iniciar sesión' }).disabled).toBe(false);
});

it('shows the reason when the sign-in fails and lets the user retry', async () => {
  loginUser.mockRejectedValueOnce(new Error('Correo o contraseña incorrectos.')).mockResolvedValueOnce({ userId: 'u1' });
  const { onLogin } = renderLogin();
  fill('alma@example.com', 'Mala1234');
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Correo o contraseña incorrectos.');
  expect(onLogin).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  await waitFor(() => expect(onLogin).toHaveBeenCalledOnce());
  expect(screen.queryByText('Correo o contraseña incorrectos.')).toBeNull();
});

it('blocks signing in while offline', () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  renderLogin();
  expect(screen.getByRole('button', { name: 'Iniciar sesión' }).disabled).toBe(true);
  expect(screen.getByText(/Sin conexión. Necesitas internet para iniciar sesión/)).toBeTruthy();
});

it('offers password recovery, sign-up and a message from the app', () => {
  const { onForgot, onRegister } = renderLogin({ message: 'Tu sesión terminó.' });
  expect(screen.getByText('Tu sesión terminó.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));
  fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
  expect(onForgot).toHaveBeenCalledOnce();
  expect(onRegister).toHaveBeenCalledOnce();
  expect(screen.getByRole('link', { name: /Volver a la portada/ }).getAttribute('href')).toBe('/');
});

it('can show and hide the password', () => {
  renderLogin();
  const password = screen.getByLabelText('Contraseña');
  expect(password.type).toBe('password');
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
  expect(password.type).toBe('text');
  fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
  expect(password.type).toBe('password');
});
