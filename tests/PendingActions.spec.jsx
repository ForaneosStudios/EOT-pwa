import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PendingActions from '../src/components/pwa/PendingActions.jsx';
import { outbox } from '../src/services/offline/index.js';
import { useOutbox } from '../src/hooks/useOutbox.js';

vi.mock('../src/services/offline/index.js', () => ({ outbox: { retry: vi.fn(), sendNow: vi.fn(), discard: vi.fn() } }));
vi.mock('../src/hooks/useOutbox.js', () => ({ useOutbox: vi.fn() }));

const items = [
  { id: 'q1', status: 'queued', label: 'Nuevo comentario' },
  { id: 'q2', status: 'sending', label: 'Nuevo tema' },
  { id: 'f1', status: 'failed', label: 'Eliminar comentario', lastError: { status: 403 } },
  { id: 's1', status: 'superseded', label: 'Editar comentario', lastError: { code: 'STALE_WRITE' } },
];

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it('renders nothing when the queue is empty', () => {
  useOutbox.mockReturnValue({ items: [], pending: 0, failed: 0, superseded: 0, paused: false });
  const { container } = render(<PendingActions />);
  expect(container.innerHTML).toBe('');
});

it('summarises the queue and manages each item', async () => {
  useOutbox.mockReturnValue({ items, pending: 2, failed: 1, superseded: 1, paused: true });
  outbox.retry.mockResolvedValue(true);
  outbox.sendNow.mockResolvedValue();
  outbox.discard.mockRejectedValueOnce(new Error('storage'));
  render(<PendingActions />);
  expect(screen.getByText(/2 acciones pendientes de enviar · 1 sin enviar por un error · 1 superada/)).toBeTruthy();
  expect(screen.getByText(/Inicia sesión para enviarlas/)).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }));
  expect(screen.getByText('Ya no tienes permiso para realizar esta acción.')).toBeTruthy();
  expect(screen.getByText(/Otra edición más reciente/)).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar de todos modos' }));
  fireEvent.click(screen.getByRole('button', { name: 'Enviar ahora' }));
  await waitFor(() => expect(outbox.retry).toHaveBeenCalledTimes(2));
  expect(outbox.sendNow).toHaveBeenCalledOnce();

  // Items being sent cannot be discarded.
  expect(screen.getAllByRole('button', { name: 'Descartar' })).toHaveLength(3);
  fireEvent.click(screen.getAllByRole('button', { name: 'Descartar' })[0]);
  expect(await screen.findByRole('alert')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }));
  expect(screen.queryByText('Nuevo comentario')).toBeNull();
});

it('uses singular labels for one item', () => {
  useOutbox.mockReturnValue({ items: [items[0]], pending: 1, failed: 0, superseded: 0, paused: false });
  render(<PendingActions />);
  expect(screen.getByText('1 acción pendiente de enviar')).toBeTruthy();
});
