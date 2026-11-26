import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from '../src/pages/profilePage.jsx';
import UserAvatar from '../src/components/profile/UserAvatar.jsx';
import { apiClient } from '../src/services/apiClient.js';
import { profileMutations } from '../src/services/mutations.js';

vi.mock('../src/services/apiClient.js', () => ({
  apiClient: { get: vi.fn() },
  getApiErrorMessage: (error, fallback) => error?.response?.data?.message || fallback,
}));
vi.mock('../src/services/mutations.js', () => ({ profileMutations: { updateAvatar: vi.fn(), updatePhoto: vi.fn(), removePhoto: vi.fn() } }));
vi.mock('../src/services/profilePhoto.js', async (importOriginal) => ({
  ...(await importOriginal()),
  squareJpeg: vi.fn(() => 'data:image/jpeg;base64,CAPTURED'),
}));

const PHOTO = 'https://project.supabase.co/storage/v1/object/public/profile-photos/me.jpg?v=1';
const user = { userId: '123', username: 'Alma', email: 'alma@example.com', profilePicture: null };

function renderProfile(current = user) {
  const onUserUpdate = vi.fn();
  const view = render(<MemoryRouter><ProfilePage user={current} onLogout={vi.fn()} onUserUpdate={onUserUpdate} /></MemoryRouter>);
  return { onUserUpdate, view };
}

async function takePhoto() {
  fireEvent.click(screen.getByRole('button', { name: 'Tomar foto con la cámara' }));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Abrir cámara' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Tomar foto' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Usar esta foto' }));
}

beforeEach(() => {
  vi.resetAllMocks();
  apiClient.get.mockResolvedValue({ data: [] });
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) } });
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
});
afterEach(cleanup);

it('sends the photo with the consent and updates the profile', async () => {
  profileMutations.updatePhoto.mockResolvedValue({ status: 'sent', data: { ...user, profilePicture: PHOTO } });
  const { onUserUpdate } = renderProfile();
  await takePhoto();
  expect(await screen.findByText('Foto de perfil actualizada.')).toBeTruthy();
  expect(profileMutations.updatePhoto).toHaveBeenCalledWith('data:image/jpeg;base64,CAPTURED');
  expect(onUserUpdate).toHaveBeenCalledWith(expect.objectContaining({ profilePicture: PHOTO }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('keeps the photo for later when there is no connection', async () => {
  profileMutations.updatePhoto.mockResolvedValue({ status: 'queued', item: {} });
  const { onUserUpdate } = renderProfile();
  await takePhoto();
  expect(await screen.findByText(/Tu foto se guardará al recuperar la conexión/)).toBeTruthy();
  expect(onUserUpdate).not.toHaveBeenCalled();
});

it('shows the server refusal inside the dialog so the player can try again', async () => {
  profileMutations.updatePhoto.mockRejectedValue({ response: { data: { message: 'La foto es demasiado grande.' } } });
  renderProfile();
  await takePhoto();
  await waitFor(() => expect(screen.getByRole('dialog').textContent).toMatch(/La foto es demasiado grande/));
  expect(screen.getByRole('button', { name: 'Usar esta foto' })).toBeTruthy();
});

it('only offers to remove the photo when there is one, and removes it', async () => {
  const { view } = renderProfile();
  expect(screen.queryByRole('button', { name: 'Quitar mi foto' })).toBeNull();
  view.unmount();

  profileMutations.removePhoto.mockResolvedValue({ status: 'sent', data: { ...user, profilePicture: null } });
  const { onUserUpdate } = renderProfile({ ...user, profilePicture: PHOTO });
  fireEvent.click(screen.getByRole('button', { name: 'Quitar mi foto' }));
  expect(await screen.findByText('Tu foto se quitó.')).toBeTruthy();
  expect(onUserUpdate).toHaveBeenCalledWith(expect.objectContaining({ profilePicture: null }));
});

it('queues the removal while offline and reports a failure', async () => {
  profileMutations.removePhoto.mockResolvedValueOnce({ status: 'queued', item: {} });
  renderProfile({ ...user, profilePicture: PHOTO });
  fireEvent.click(screen.getByRole('button', { name: 'Quitar mi foto' }));
  expect(await screen.findByText(/Tu foto se quitará al recuperar la conexión/)).toBeTruthy();

  profileMutations.removePhoto.mockRejectedValueOnce({ response: { data: { message: 'Sin permiso' } } });
  fireEvent.click(screen.getByRole('button', { name: 'Quitar mi foto' }));
  expect(await screen.findByText('Sin permiso')).toBeTruthy();
});

it('shows the photo as the portrait and none of the catalog silhouettes as selected', () => {
  renderProfile({ ...user, profilePicture: PHOTO });
  expect(screen.getAllByAltText('Avatar de Alma')[0].getAttribute('src')).toBe(PHOTO);
  expect(screen.getAllByRole('button', { name: /Seleccionar silueta/ }).every((button) => button.getAttribute('aria-pressed') === 'false')).toBe(true);
});

it('follows the portrait when it changes from outside the page', () => {
  const { view } = renderProfile();
  view.rerender(<MemoryRouter><ProfilePage user={{ ...user, profilePicture: '/avatars/avatar-4.svg' }} onLogout={vi.fn()} onUserUpdate={vi.fn()} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Seleccionar silueta 4' }).getAttribute('aria-pressed')).toBe('true');
});

it('falls back to the default silhouette when a photo cannot be loaded', () => {
  render(<UserAvatar src={PHOTO} username="Kai" className="h-8 w-8" />);
  const image = screen.getByAltText('Avatar de Kai');
  expect(image.getAttribute('src')).toBe(PHOTO);
  fireEvent.error(image);
  expect(screen.getByAltText('Avatar de Kai').getAttribute('src')).toBe('/avatars/avatar-1.svg');
});

it('uses the default silhouette when the player has no portrait', () => {
  render(<UserAvatar src={null} username="Kai" />);
  expect(screen.getByAltText('Avatar de Kai').getAttribute('src')).toBe('/avatars/avatar-1.svg');
});
