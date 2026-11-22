import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ResetPasswordPage from '../src/pages/resetPasswordPage.jsx';
import { confirmPasswordReset, validateResetToken } from '../src/services/authService.js';

vi.mock('../src/services/authService.js', () => ({ confirmPasswordReset: vi.fn(), validateResetToken: vi.fn() }));
vi.mock('../src/services/apiClient.js', () => ({ getApiErrorMessage: (_error, fallback) => fallback }));

beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState(null, '', '/reset-password?token=abc123');
});
afterEach(cleanup);

function fill(password, confirmation = password) {
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: confirmation } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
}

describe('reset password page', () => {
  it('validates the link, removes the token from the address bar and changes the password', async () => {
    validateResetToken.mockResolvedValue(true);
    confirmPasswordReset.mockResolvedValue();
    const onDone = vi.fn();
    render(<ResetPasswordPage onDone={onDone} onRequestNew={vi.fn()} />);
    expect(window.location.search).toBe('');
    await screen.findByLabelText('Nueva contraseña');
    expect(validateResetToken).toHaveBeenCalledWith('abc123');
    fill('Nueva#2026');
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true));
    expect(confirmPasswordReset).toHaveBeenCalledWith('abc123', 'Nueva#2026');
  });

  it('rejects mismatching passwords without calling the backend', async () => {
    validateResetToken.mockResolvedValue(true);
    render(<ResetPasswordPage onDone={vi.fn()} onRequestNew={vi.fn()} />);
    await screen.findByLabelText('Nueva contraseña');
    fill('Nueva#2026', 'Otra#2026');
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeTruthy();
    expect(confirmPasswordReset).not.toHaveBeenCalled();
  });

  it('applies the sign-up password rules before calling the backend', async () => {
    validateResetToken.mockResolvedValue(true);
    render(<ResetPasswordPage onDone={vi.fn()} onRequestNew={vi.fn()} />);
    await screen.findByLabelText('Nueva contraseña');
    fill('corta1A');
    expect(await screen.findByText('Debe tener al menos 8 caracteres.')).toBeTruthy();
    fill('sinmayuscula1');
    expect(await screen.findByText('Incluye al menos una mayúscula y un número.')).toBeTruthy();
    fill('SinNumeroAqui');
    expect(await screen.findByText('Incluye al menos una mayúscula y un número.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'Valida2026' } });
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Valida2026' } });
    expect(screen.queryByText('Las contraseñas no coinciden.')).toBeNull();
    expect(screen.queryByText('Incluye al menos una mayúscula y un número.')).toBeNull();
    expect(confirmPasswordReset).not.toHaveBeenCalled();
  });

  it('offers a new link when the token is dead, missing or burnt while saving', async () => {
    validateResetToken.mockResolvedValue(false);
    const onRequestNew = vi.fn();
    const { unmount } = render(<ResetPasswordPage onDone={vi.fn()} onRequestNew={onRequestNew} />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/expiró/);
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar un enlace nuevo' }));
    expect(onRequestNew).toHaveBeenCalledOnce();
    unmount();

    window.history.replaceState(null, '', '/reset-password');
    render(<ResetPasswordPage onDone={vi.fn()} onRequestNew={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toMatch(/expiró/);
    expect(validateResetToken).toHaveBeenCalledTimes(1);
    cleanup();

    window.history.replaceState(null, '', '/reset-password?token=zzz');
    validateResetToken.mockResolvedValue(true);
    confirmPasswordReset.mockRejectedValue({ response: { status: 400, data: { code: 'BAD_REQUEST', message: 'El enlace no es válido o ya expiró.' } } });
    render(<ResetPasswordPage onDone={vi.fn()} onRequestNew={vi.fn()} />);
    await screen.findByLabelText('Nueva contraseña');
    fill('Nueva#2026');
    expect((await screen.findByRole('alert')).textContent).toMatch(/expiró/);
  });

  it('reports other failures and connection problems', async () => {
    validateResetToken.mockResolvedValue(true);
    confirmPasswordReset.mockRejectedValue(new Error('down'));
    const onDone = vi.fn();
    const { unmount } = render(<ResetPasswordPage onDone={onDone} onRequestNew={vi.fn()} />);
    await screen.findByLabelText('Nueva contraseña');
    fill('Nueva#2026');
    expect((await screen.findByRole('alert')).textContent).toMatch(/No se pudo cambiar/);
    fireEvent.click(screen.getByRole('button', { name: 'Volver a iniciar sesión' }));
    expect(onDone).toHaveBeenCalledWith(false);
    unmount();

    window.history.replaceState(null, '', '/reset-password?token=abc');
    validateResetToken.mockRejectedValue(new Error('offline'));
    render(<ResetPasswordPage onDone={vi.fn()} onRequestNew={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/No se pudo verificar/);
  });
});
