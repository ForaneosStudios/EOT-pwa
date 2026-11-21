import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '../src/pages/registerPage.jsx';
import { isUsernameAvailable, registerUser } from '../src/services/authService.js';

vi.mock('../src/services/authService.js', () => ({ isUsernameAvailable: vi.fn(), registerUser: vi.fn() }));
vi.mock('../src/services/apiClient.js', () => ({ getApiErrorMessage: (error, fallback) => error?.message || fallback }));

function renderRegister() {
  const handlers = { onLogin: vi.fn(), onOpenLogin: vi.fn() };
  render(<MemoryRouter><RegisterPage {...handlers} /></MemoryRouter>);
  return handlers;
}

const field = (label) => screen.getByLabelText(label);
const type = (label, value) => fireEvent.change(field(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

function fillValid(overrides = {}) {
  const values = { 'Nombre de usuario': 'alma_01', 'Correo electrónico': 'alma@example.com', Contraseña: 'Secreta1', 'Confirmar contraseña': 'Secreta1', ...overrides };
  Object.entries(values).forEach(([label, value]) => type(label, value));
}

beforeEach(() => {
  vi.resetAllMocks();
  isUsernameAvailable.mockResolvedValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('lists every missing field when submitting an empty form', () => {
  renderRegister();
  submit();
  expect(screen.getByText('El nombre de usuario es obligatorio.')).toBeTruthy();
  expect(screen.getByText('El correo electrónico es obligatorio.')).toBeTruthy();
  expect(screen.getByText('La contraseña es obligatoria.')).toBeTruthy();
  expect(screen.getByText('Confirma tu contraseña.')).toBeTruthy();
  expect(registerUser).not.toHaveBeenCalled();
});

it('validates each field when the user leaves it', () => {
  renderRegister();
  const checks = [
    ['Nombre de usuario', 'abc', 'Debe tener al menos 4 caracteres.'],
    ['Nombre de usuario', 'mal nombre!', 'Solo letras, números y guion bajo.'],
    ['Correo electrónico', 'sin-arroba', 'Introduce un correo válido.'],
    ['Contraseña', 'corta', 'Debe tener al menos 8 caracteres.'],
    ['Contraseña', 'sinmayuscula1', 'Incluye al menos una mayúscula y un número.'],
    ['Contraseña', 'SinNumeroAqui', 'Incluye al menos una mayúscula y un número.'],
  ];
  for (const [label, value, message] of checks) {
    type(label, value);
    fireEvent.blur(field(label));
    expect(screen.getByText(message)).toBeTruthy();
  }
  type('Nombre de usuario', 'alma_01');
  expect(screen.queryByText('Solo letras, números y guion bajo.')).toBeNull();
});

it('keeps the password confirmation in sync with the password', () => {
  renderRegister();
  type('Contraseña', 'Secreta1');
  type('Confirmar contraseña', 'Secreta1');
  fireEvent.blur(field('Confirmar contraseña'));
  type('Contraseña', 'Secreta2');
  expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy();
  type('Contraseña', 'Secreta1');
  expect(screen.queryByText('Las contraseñas no coinciden.')).toBeNull();
});

it('rejects mismatched passwords on submit', () => {
  renderRegister();
  fillValid({ 'Confirmar contraseña': 'Distinta1' });
  submit();
  expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy();
  expect(isUsernameAvailable).not.toHaveBeenCalled();
});

it('does not create the account when the username is taken', async () => {
  isUsernameAvailable.mockResolvedValue(false);
  renderRegister();
  fillValid();
  submit();
  expect(await screen.findByText('Este nombre de usuario ya está en uso.')).toBeTruthy();
  expect(registerUser).not.toHaveBeenCalled();
});

it('creates the account and signs the new player in', async () => {
  registerUser.mockResolvedValue({ userId: 'u9', username: 'alma_01' });
  const { onLogin } = renderRegister();
  fillValid();
  submit();
  expect(await screen.findByRole('button', { name: 'Creando cuenta...' })).toBeTruthy();
  await waitFor(() => expect(onLogin).toHaveBeenCalledWith({ userId: 'u9', username: 'alma_01' }));
  expect(registerUser).toHaveBeenCalledWith({ userName: 'alma_01', email: 'alma@example.com', password: 'Secreta1', passwordConfirmation: 'Secreta1' });
  expect(field('Nombre de usuario').value).toBe('');
});

it('shows why the account could not be created', async () => {
  registerUser.mockRejectedValue(new Error('Este correo ya está registrado.'));
  const { onLogin } = renderRegister();
  fillValid();
  submit();
  expect((await screen.findByRole('alert')).textContent).toBe('Este correo ya está registrado.');
  expect(onLogin).not.toHaveBeenCalled();
});

it('blocks sign-up while offline and links back to sign-in', () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  const { onOpenLogin } = renderRegister();
  expect(screen.getByRole('button', { name: 'Crear cuenta' }).disabled).toBe(true);
  expect(screen.getByText(/Necesitas internet para crear tu cuenta/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(onOpenLogin).toHaveBeenCalledOnce();
});
