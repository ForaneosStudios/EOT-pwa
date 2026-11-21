import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ForumThreadPage from '../src/pages/forumThreadPage.jsx';
import { apiClient } from '../src/services/apiClient.js';
import { forumMutations } from '../src/services/mutations.js';
import { outbox } from '../src/services/offline/index.js';
import { useOutbox, useOutboxSynced } from '../src/hooks/useOutbox.js';

vi.mock('../src/services/apiClient.js', () => ({
  apiClient: { get: vi.fn() },
  getApiErrorMessage: (error, fallback) => error?.response?.data?.message || fallback,
}));
vi.mock('../src/services/mutations.js', () => ({
  forumMutations: {
    createPost: vi.fn(), updatePost: vi.fn(), deletePost: vi.fn(), reportPost: vi.fn(),
    lockThread: vi.fn(), updateThread: vi.fn(), deleteThread: vi.fn(),
  },
}));
vi.mock('../src/services/offline/index.js', () => ({
  outbox: { update: vi.fn(), retry: vi.fn(), discard: vi.fn() },
}));
vi.mock('../src/hooks/useOutbox.js', () => ({ useOutbox: vi.fn(), useOutboxSynced: vi.fn() }));

const user = { userId: 'me', username: 'Alma' };
const thread = { threadId: 't1', userId: 'me', username: 'Alma', title: 'Mi hilo', content: 'Contenido', isLocked: false };
const myPost = { postId: 'p1', userId: 'me', username: 'Alma', content: 'Mi comentario', createdAt: '2026-11-21T10:00:00Z' };
const otherPost = { postId: 'p2', userId: 'other', username: 'Kai', content: 'Comentario ajeno', createdAt: '2026-11-21T11:00:00Z' };
const sent = { status: 'sent', data: {} };
const queued = { status: 'queued', item: {} };

function mockApi({ threadData = thread, posts = [myPost, otherPost], fail = false } = {}) {
  apiClient.get.mockImplementation((url, config) => {
    if (fail) return Promise.reject(new Error('down'));
    if (url === '/threads/t1') return Promise.resolve({ data: threadData });
    if (url === '/threads/t1/reports') return Promise.resolve({ data: { content: [{ reportId: 'r1', reporterUsername: 'Kai', reason: 'spam', status: 'PENDING' }] } });
    if (url === '/posts/page' && config?.params?.parentPostId) return Promise.resolve({ data: { content: [{ ...otherPost, postId: 'p3', content: 'Respuesta cargada' }] } });
    return Promise.resolve({ data: { content: posts, first: true, last: true } });
  });
}

function renderPage(items = []) {
  useOutbox.mockReturnValue({ items });
  render(<MemoryRouter initialEntries={['/forum/t1']}>
    <Routes>
      <Route path="/forum/:threadId" element={<ForumThreadPage user={user} onLogout={vi.fn()} />} />
      <Route path="/forum" element={<p>Lista del foro</p>} />
    </Routes>
  </MemoryRouter>);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(window, 'prompt').mockReturnValue(null);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('forum thread page', () => {
  it('publishes a comment and reloads the thread', async () => {
    mockApi();
    forumMutations.createPost.mockResolvedValue(sent);
    renderPage();
    await screen.findByText('Mi hilo');
    fireEvent.change(screen.getByPlaceholderText('Escribe un comentario'), { target: { value: 'Hola' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar comentario' }));
    await waitFor(() => expect(forumMutations.createPost).toHaveBeenCalledWith({ threadId: 't1', userId: 'me', content: 'Hola' }));
    await waitFor(() => expect(apiClient.get.mock.calls.filter(([url]) => url === '/threads/t1')).toHaveLength(2));
  });

  it('tells the user when a comment is queued and shows refusals', async () => {
    mockApi();
    forumMutations.createPost.mockResolvedValueOnce(queued)
      .mockRejectedValueOnce({ response: { data: { message: 'El hilo se encuentra bloqueado' } } });
    renderPage();
    await screen.findByText('Mi hilo');
    const box = screen.getByPlaceholderText('Escribe un comentario');
    fireEvent.change(box, { target: { value: 'Sin red' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar comentario' }));
    expect(await screen.findByText(/se enviará automáticamente/)).toBeTruthy();
    fireEvent.change(box, { target: { value: 'Otra vez' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar comentario' }));
    expect((await screen.findByRole('alert')).textContent).toContain('bloqueado');
  });

  it('shows an error when the thread cannot be loaded', async () => {
    mockApi({ fail: true });
    renderPage();
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo cargar el hilo.');
  });

  it('runs the owner actions: lock, edit, reports and delete', async () => {
    mockApi();
    forumMutations.lockThread.mockResolvedValue(sent);
    forumMutations.updateThread.mockResolvedValue(sent);
    forumMutations.deleteThread.mockResolvedValue(sent);
    renderPage();
    await screen.findByText('Mi hilo');

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar conversación' }));
    await waitFor(() => expect(forumMutations.lockThread).toHaveBeenCalledWith('t1', true));

    window.prompt.mockReturnValueOnce('Nuevo título').mockReturnValueOnce('Nuevo contenido');
    fireEvent.click(screen.getByRole('button', { name: 'Editar tema' }));
    await waitFor(() => expect(forumMutations.updateThread).toHaveBeenCalledWith('t1', { title: 'Nuevo título', content: 'Nuevo contenido' }));

    fireEvent.click(screen.getByRole('button', { name: 'Revisar reportes' }));
    expect(await screen.findByText(/Reporte de Kai: spam/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar tema' }));
    expect(await screen.findByText('Lista del foro')).toBeTruthy();
  });

  it('edits, replies to, deletes and reports posts', async () => {
    mockApi();
    forumMutations.updatePost.mockResolvedValue(sent);
    forumMutations.deletePost.mockResolvedValue(sent);
    forumMutations.reportPost.mockResolvedValue(sent);
    forumMutations.createPost.mockResolvedValue(queued);
    renderPage();
    await screen.findByText('Mi comentario');

    window.prompt.mockReturnValueOnce('Editado');
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
    await waitFor(() => expect(forumMutations.updatePost).toHaveBeenCalledWith('p1', 'Editado', 't1'));

    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
    await waitFor(() => expect(forumMutations.deletePost).toHaveBeenCalledWith('p1', 't1'));

    window.prompt.mockReturnValueOnce('spam');
    fireEvent.click(screen.getByRole('button', { name: 'Reportar' }));
    await waitFor(() => expect(forumMutations.reportPost).toHaveBeenCalledWith('p2', 'spam', 't1'));
    expect(await screen.findByText('Reporte enviado.')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Responder' })[1]);
    fireEvent.change(screen.getByPlaceholderText('Escribe una respuesta'), { target: { value: 'Respuesta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(forumMutations.createPost).toHaveBeenCalledWith({ threadId: 't1', userId: 'me', parentPostId: 'p2', content: 'Respuesta' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Ver respuestas' })[0]);
    expect(await screen.findByText('Respuesta cargada')).toBeTruthy();
  });

  it('reports a failure to load replies', async () => {
    mockApi();
    renderPage();
    await screen.findByText('Mi comentario');
    apiClient.get.mockRejectedValueOnce(new Error('down'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver respuestas' })[0]);
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudieron cargar las respuestas.');
  });

  it('shows queued, failed and superseded items and lets the user manage them', async () => {
    mockApi();
    outbox.update.mockResolvedValue(true);
    outbox.retry.mockResolvedValue(true);
    outbox.discard.mockRejectedValueOnce(new Error('storage')).mockResolvedValue(true);
    renderPage([
      { id: 'q1', status: 'queued', label: 'Nuevo comentario', data: { threadId: 't1', content: 'Pendiente raíz' }, meta: { kind: 'post:create', threadId: 't1' } },
      { id: 'f1', status: 'failed', label: 'Editar comentario', data: { content: 'Edición fallida' }, lastError: { status: 403 }, meta: { kind: 'post:update', threadId: 't1', postId: 'p1' } },
      { id: 's1', status: 'superseded', label: 'Editar comentario', data: { content: 'Edición vieja' }, lastError: { code: 'STALE_WRITE' }, meta: { kind: 'post:update', threadId: 't1', postId: 'p2' } },
      { id: 'd1', status: 'queued', label: 'Eliminar comentario', data: null, meta: { kind: 'post:delete', threadId: 't1', postId: 'p2' } },
      { id: 'l1', status: 'queued', label: 'Cerrar conversación', data: { locked: true }, meta: { kind: 'thread:lock', threadId: 't1' } },
    ]);
    expect(await screen.findByText('Pendiente raíz')).toBeTruthy();
    expect(screen.getByText(/eliminación pendiente/)).toBeTruthy();
    expect(screen.getByText(/Cerrar conversación · Pendiente/)).toBeTruthy();
    expect(screen.getByText(/Otra edición más reciente/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(outbox.retry).toHaveBeenCalledWith('f1'));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar de todos modos' }));
    await waitFor(() => expect(outbox.retry).toHaveBeenCalledWith('s1'));

    window.prompt.mockReturnValueOnce('Corregido');
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' }).at(-1));
    await waitFor(() => expect(outbox.update).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole('button', { name: 'Descartar' })[0]);
    expect(await screen.findByText(/No se pudo actualizar la acción pendiente/)).toBeTruthy();
  });

  it('reloads when a queued action for this thread is confirmed', async () => {
    mockApi();
    renderPage();
    await screen.findByText('Mi hilo');
    const onSynced = useOutboxSynced.mock.calls.at(-1)[0];
    onSynced({ item: { meta: { threadId: 'otro' } } });
    onSynced({ item: { meta: { threadId: 't1' } } });
    await waitFor(() => expect(apiClient.get.mock.calls.filter(([url]) => url === '/threads/t1')).toHaveLength(2));
  });

  it('hides edit actions on a locked thread', async () => {
    mockApi({ threadData: { ...thread, isLocked: true } });
    renderPage();
    await screen.findByText(/Conversación cerrada/);
    expect(screen.queryByRole('button', { name: 'Editar tema' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Reabrir' })).toBeTruthy();
    expect(screen.queryByPlaceholderText('Escribe un comentario')).toBeNull();
  });
});
