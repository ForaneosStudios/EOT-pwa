import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminPage from '../src/pages/adminPage.jsx';
import { apiClient } from '../src/services/apiClient.js';
import { adminMutations } from '../src/services/mutations.js';
import { useOutboxSynced } from '../src/hooks/useOutbox.js';

vi.mock('../src/services/apiClient.js', () => ({
  apiClient: { get: vi.fn() },
  getApiErrorMessage: (error, fallback) => error?.response?.data?.message || fallback,
}));
vi.mock('../src/services/mutations.js', () => ({
  adminMutations: {
    deleteUser: vi.fn(), deleteThread: vi.fn(), lockThread: vi.fn(), removePhoto: vi.fn(),
    createAchievement: vi.fn(), createCategory: vi.fn(), deleteCategory: vi.fn(),
  },
}));
vi.mock('../src/hooks/useOutbox.js', () => ({ useOutboxSynced: vi.fn() }));

const admin = { userId: 'admin', username: 'Valkyrie', role: 'ADMIN' };
const data = {
  '/users': [admin, { userId: 'u2', username: 'Kai', email: 'kai@example.com', role: 'USER', createdAt: '2026-11-01T00:00:00Z' }],
  '/threads/search': { content: [{ threadId: 't1', title: 'Hilo', content: 'Texto', username: 'Kai', isLocked: false }] },
  '/achievements': [{ achId: 'a1', achName: 'Ascenso' }],
  '/categories': [{ categoryId: 'c1', categoryName: 'Lore', description: 'Historia' }],
};
const sent = { status: 'sent', data: {} };

function renderAdmin() {
  render(<MemoryRouter><AdminPage user={admin} onLogout={vi.fn()} /></MemoryRouter>);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  apiClient.get.mockImplementation((url) => Promise.resolve({ data: data[url] }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('deletes an account and reloads the console', async () => {
  adminMutations.deleteUser.mockResolvedValue(sent);
  renderAdmin();
  fireEvent.click(await screen.findByRole('tab', { name: 'Cuentas' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));
  expect(await screen.findByText('La cuenta fue eliminada.')).toBeTruthy();
  expect(adminMutations.deleteUser).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u2' }));
  expect(apiClient.get.mock.calls.filter(([url]) => url === '/users')).toHaveLength(2);
});

it('lets an administrator remove the photo of an account that has one', async () => {
  const accounts = [admin, { userId: 'u2', username: 'Kai', email: 'kai@example.com', role: 'USER', createdAt: '2026-11-01T00:00:00Z', profilePicture: 'https://project.supabase.co/storage/v1/object/public/profile-photos/kai.jpg?v=1' },
    { userId: 'u3', username: 'Mia', email: 'mia@example.com', role: 'USER', createdAt: '2026-11-02T00:00:00Z', profilePicture: '/avatars/avatar-2.svg' }];
  apiClient.get.mockImplementation((url) => Promise.resolve({ data: url === '/users' ? accounts : data[url] }));
  adminMutations.removePhoto.mockResolvedValue(sent);
  renderAdmin();
  fireEvent.click(await screen.findByRole('tab', { name: 'Cuentas' }));
  expect(await screen.findAllByRole('button', { name: 'Quitar foto' })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Quitar foto' }));
  expect(await screen.findByText('La foto fue eliminada.')).toBeTruthy();
  expect(adminMutations.removePhoto).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u2' }));
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Kai'));
});

it('queues forum moderation while offline without reloading', async () => {
  adminMutations.lockThread.mockResolvedValue({ status: 'queued', item: {} });
  adminMutations.deleteThread.mockResolvedValue({ status: 'queued', item: {} });
  renderAdmin();
  fireEvent.click(await screen.findByRole('tab', { name: 'Foro' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Bloquear' }));
  expect(await screen.findByText(/La acción quedó en cola/)).toBeTruthy();
  expect(adminMutations.lockThread).toHaveBeenCalledWith(expect.objectContaining({ threadId: 't1' }), true);
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
  await waitFor(() => expect(adminMutations.deleteThread).toHaveBeenCalled());
  expect(apiClient.get.mock.calls.filter(([url]) => url === '/users')).toHaveLength(1);
});

it('creates catalog content and shows refusals', async () => {
  adminMutations.createAchievement.mockResolvedValue(sent);
  adminMutations.createCategory.mockRejectedValue({ response: { data: { message: 'La categoría ya existe' } } });
  adminMutations.deleteCategory.mockResolvedValue(sent);
  renderAdmin();
  fireEvent.click(await screen.findByRole('tab', { name: 'Contenido' }));

  fireEvent.change(screen.getByPlaceholderText('Nombre del logro'), { target: { value: 'Nuevo logro' } });
  fireEvent.change(screen.getByPlaceholderText('Descripción'), { target: { value: 'Algo épico' } });
  fireEvent.change(screen.getByPlaceholderText('Meta (opcional)'), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar logro' }));
  expect(await screen.findByText('El logro fue añadido al catálogo.')).toBeTruthy();
  expect(adminMutations.createAchievement).toHaveBeenCalledWith(expect.objectContaining({ achName: 'Nuevo logro', targetValue: 3, achPicture: null }));

  fireEvent.change(screen.getByPlaceholderText('Nombre de categoría'), { target: { value: 'Lore' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear categoría' }));
  expect((await screen.findByRole('alert')).textContent).toContain('La categoría ya existe');

  fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
  expect(await screen.findByText('La categoría fue eliminada.')).toBeTruthy();
});

it('reloads when a queued admin action is confirmed', async () => {
  renderAdmin();
  await screen.findByRole('tab', { name: 'Cuentas' });
  const onSynced = useOutboxSynced.mock.calls.at(-1)[0];
  onSynced({ item: { meta: { kind: 'post:create' } } });
  onSynced({ item: { meta: { kind: 'admin:user:delete' } } });
  await waitFor(() => expect(apiClient.get.mock.calls.filter(([url]) => url === '/users').length).toBeGreaterThan(1));
});
