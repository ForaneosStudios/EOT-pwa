import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from '../src/pages/profilePage.jsx';
import { apiClient } from '../src/services/apiClient.js';
import { profileMutations } from '../src/services/mutations.js';

vi.mock('../src/services/apiClient.js', () => ({
  apiClient: { get: vi.fn() },
  getApiErrorMessage: (error, fallback) => error?.response?.data?.message || fallback,
}));
vi.mock('../src/services/mutations.js', () => ({ profileMutations: { updateAvatar: vi.fn() } }));

const user = { userId: '123', username: 'Alma', email: 'alma@example.com' };

function renderProfile(onUserUpdate = vi.fn()) {
  render(<MemoryRouter><ProfilePage user={user} onLogout={vi.fn()} onUserUpdate={onUserUpdate} /></MemoryRouter>);
  return onUserUpdate;
}

beforeEach(() => {
  vi.resetAllMocks();
  apiClient.get.mockResolvedValue({ data: [] });
});
afterEach(cleanup);

it('saves the portrait and updates the profile', async () => {
  profileMutations.updateAvatar.mockResolvedValue({ status: 'sent', data: { ...user, profilePicture: '/avatars/avatar-3.svg' } });
  const onUserUpdate = renderProfile();
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar silueta 3' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar retrato' }));
  expect(await screen.findByText('Retrato actualizado.')).toBeTruthy();
  expect(profileMutations.updateAvatar).toHaveBeenCalledWith('/avatars/avatar-3.svg');
  expect(onUserUpdate).toHaveBeenCalledWith(expect.objectContaining({ profilePicture: '/avatars/avatar-3.svg' }));
});

it('explains that the portrait will be saved when back online', async () => {
  profileMutations.updateAvatar.mockResolvedValue({ status: 'queued', item: {} });
  const onUserUpdate = renderProfile();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar retrato' }));
  expect(await screen.findByText(/se guardará al recuperar la conexión/)).toBeTruthy();
  expect(onUserUpdate).not.toHaveBeenCalled();
});

it('shows why the portrait could not be saved', async () => {
  profileMutations.updateAvatar.mockRejectedValue({ response: { data: { message: 'Avatar no permitido' } } });
  renderProfile();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar retrato' }));
  await waitFor(() => expect(screen.getByText('Avatar no permitido')).toBeTruthy());
});
