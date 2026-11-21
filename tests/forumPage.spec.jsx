import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForumPage from '../src/pages/forumPage.jsx';
import { apiClient } from '../src/services/apiClient.js';
import { forumMutations } from '../src/services/mutations.js';
import { useOutbox, useOutboxSynced } from '../src/hooks/useOutbox.js';

vi.mock('../src/services/apiClient.js', () => ({
  apiClient: { get: vi.fn() },
  getApiErrorMessage: (error, fallback) => error?.response?.data?.message || fallback,
}));
vi.mock('../src/services/mutations.js', () => ({ forumMutations: { createThread: vi.fn() } }));
vi.mock('../src/hooks/useOutbox.js', () => ({ useOutbox: vi.fn(), useOutboxSynced: vi.fn() }));

const user = { userId: 'me', username: 'Alma' };
const page = { content: [{ threadId: 't1', title: 'Teorías del trono', username: 'Kai', categoryName: 'Lore' }], first: true, last: true };

function renderForum(items = []) {
  useOutbox.mockReturnValue({ items });
  render(<MemoryRouter initialEntries={['/forum']}><ForumPage user={user} onLogout={vi.fn()} message="" /></MemoryRouter>);
}

async function submitTopic() {
  fireEvent.click(screen.getByRole('button', { name: '+ Nuevo tema' }));
  const dialog = within(screen.getByRole('dialog'));
  fireEvent.change(dialog.getByLabelText(/Título/), { target: { value: 'Un tema nuevo' } });
  fireEvent.change(dialog.getByLabelText(/Mensaje/), { target: { value: 'Contenido suficiente' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publicar tema' }));
}

beforeEach(() => {
  vi.resetAllMocks();
  apiClient.get.mockResolvedValue({ data: page });
});
afterEach(cleanup);

it('creates a topic and reloads the first page', async () => {
  forumMutations.createThread.mockResolvedValue({ status: 'sent', data: {} });
  renderForum();
  expect(await screen.findByText('Teorías del trono')).toBeTruthy();
  await submitTopic();
  await waitFor(() => expect(forumMutations.createThread).toHaveBeenCalledWith({ userId: 'me', title: 'Un tema nuevo', content: 'Contenido suficiente' }));
  expect(screen.queryByText(/se publicará/)).toBeNull();
});

it('explains when a topic is queued offline and lists pending topics', async () => {
  forumMutations.createThread.mockResolvedValue({ status: 'queued', item: {} });
  renderForum([
    { id: 'q1', status: 'queued', data: { title: 'Tema sin red' }, meta: { kind: 'thread:create' } },
    { id: 'f1', status: 'failed', data: { title: 'Tema rechazado' }, lastError: { status: 400 }, meta: { kind: 'thread:create' } },
  ]);
  await screen.findByText('Teorías del trono');
  expect(screen.getByText('Tema sin red')).toBeTruthy();
  expect(screen.getByText(/rechazó los datos/)).toBeTruthy();
  await submitTopic();
  expect(await screen.findByText(/Tu tema se publicará cuando vuelva la conexión/)).toBeTruthy();
});

it('shows why a topic could not be created', async () => {
  forumMutations.createThread.mockRejectedValue({ response: { data: { message: 'Categoría no encontrada' } } });
  renderForum();
  await screen.findByText('Teorías del trono');
  await submitTopic();
  expect((await screen.findByRole('alert')).textContent).toContain('Categoría no encontrada');
});

it('reloads the list when a queued topic is confirmed', async () => {
  renderForum();
  await screen.findByText('Teorías del trono');
  const onSynced = useOutboxSynced.mock.calls.at(-1)[0];
  onSynced({ item: { meta: { kind: 'profile:avatar' } } });
  onSynced({ item: { meta: { kind: 'thread:create' } } });
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
});
