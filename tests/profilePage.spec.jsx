import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from '../src/pages/profilePage.jsx';
import { apiClient } from '../src/services/apiClient.js';

vi.mock('../src/services/apiClient.js', () => ({
  apiClient: { get: vi.fn() },
  getApiErrorMessage: () => 'No se pudo cargar el progreso.',
}));
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

function renderProfile(onLogout = vi.fn()) {
  render(<MemoryRouter initialEntries={['/profile']}><ProfilePage user={{ userId: '123', username: 'Alma' }} onLogout={onLogout} /></MemoryRouter>);
  return onLogout;
}

it('shows the real username and unlocked achievement count', async () => {
  apiClient.get.mockResolvedValue({ data: [{ isUnlocked: true }, { isUnlocked: false }, { isUnlocked: true }] });
  const onLogout = renderProfile();
  expect(screen.getByText('Alma')).toBeTruthy();
  expect(await screen.findByText('2 logros desbloqueados')).toBeTruthy();
  expect(apiClient.get).toHaveBeenCalledWith('/user-achievements/me', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(screen.getByRole('link', { name: 'Mi perfil' }).getAttribute('aria-current')).toBe('page');
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(onLogout).toHaveBeenCalledOnce();
});

it('shows a loading state, handles errors and retries', async () => {
  apiClient.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: [] });
  renderProfile();
  expect(screen.getByText('Cargando logros...')).toBeTruthy();
  expect(await screen.findByRole('alert')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('0 logros desbloqueados')).toBeTruthy();
});

it('does not interpret malformed responses as an empty achievement list', async () => {
  apiClient.get.mockResolvedValue({ data: {} });
  renderProfile();
  expect(await screen.findByRole('alert')).toBeTruthy();
});
