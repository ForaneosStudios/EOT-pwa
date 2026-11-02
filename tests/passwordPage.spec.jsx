import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PasswordPage from '../src/pages/passwordPage.jsx';
import { logoutUser, requestPasswordReset, updatePassword } from '../src/services/authService.js';

vi.mock('../src/services/authService.js', () => ({
  logoutUser: vi.fn(), requestPasswordReset: vi.fn(), updatePassword: vi.fn(),
}));
vi.mock('../src/services/apiClient.js', () => ({ getApiErrorMessage: (_error, fallback) => fallback }));

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe('password recovery', () => {
  it('sends a recovery email and displays a generic confirmation', async () => {
    requestPasswordReset.mockResolvedValue();
    render(<PasswordPage onLogin={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(requestPasswordReset).toHaveBeenCalledWith('test@example.com');
    expect(screen.getByText(/Si existe una cuenta/)).toBeTruthy();
  });

  it('updates the password and signs out after a valid recovery link', async () => {
    const onLogin = vi.fn();
    updatePassword.mockResolvedValue();
    logoutUser.mockResolvedValue();
    render(<PasswordPage recovery status="success" onLogin={onLogin} />);
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    await waitFor(() => expect(onLogin).toHaveBeenCalledOnce());
    expect(updatePassword).toHaveBeenCalledWith('password123');
    expect(logoutUser).toHaveBeenCalledOnce();
  });

  it('shows errors and allows returning to login', async () => {
    const onLogin = vi.fn();
    requestPasswordReset.mockRejectedValue(new Error('unavailable'));
    render(<PasswordPage onLogin={onLogin} />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a iniciar sesión' }));
    expect(onLogin).toHaveBeenCalledOnce();
  });

  it('does not allow password changes while the link is checking or invalid', () => {
    const { rerender } = render(<PasswordPage recovery status="checking" onLogin={vi.fn()} />);
    expect(screen.getByText('Verificando enlace...')).toBeTruthy();
    rerender(<PasswordPage recovery status="error" onLogin={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByLabelText('Nueva contraseña')).toBeNull();
  });
});
