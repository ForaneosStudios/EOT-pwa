import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '../src/app/auth/AuthProvider.jsx';
import { useAuth } from '../src/app/auth/authContext.js';
import { OutboxProvider } from '../src/app/offline/OutboxProvider.jsx';
import { logoutUser, restoreUser } from '../src/services/authService.js';
import { outbox, startOutbox } from '../src/services/offline/index.js';
import { useOutboxSynced } from '../src/hooks/useOutbox.js';

vi.mock('../src/services/authService.js', () => ({
  takeConfirmationResult: () => null, verifyConfirmation: vi.fn(), restoreUser: vi.fn(), logoutUser: vi.fn(),
  subscribeToAuthChanges: () => () => {},
}));
vi.mock('../src/services/offline/index.js', () => ({
  outbox: { getSnapshot: vi.fn(), clearOwner: vi.fn(), setOwner: vi.fn() },
  startOutbox: vi.fn(),
}));
vi.mock('../src/hooks/useOutbox.js', () => ({ useOutboxSynced: vi.fn() }));

// Exposes the auth context to the tests after each render.
const captured = { current: null };
function Probe() {
  const value = useAuth();
  useEffect(() => { captured.current = value; });
  return <p>{value.user?.profilePicture ?? 'sin retrato'}</p>;
}

function renderSession() {
  render(<AuthProvider><OutboxProvider><Probe /></OutboxProvider></AuthProvider>);
}

beforeEach(() => {
  vi.resetAllMocks();
  restoreUser.mockResolvedValue({ userId: 'u1', username: 'Alma' });
  logoutUser.mockResolvedValue();
  outbox.setOwner.mockResolvedValue();
  outbox.clearOwner.mockResolvedValue();
  startOutbox.mockReturnValue(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('ties the outbox to the signed-in account', async () => {
  outbox.getSnapshot.mockReturnValue({ items: [] });
  renderSession();
  await waitFor(() => expect(outbox.setOwner).toHaveBeenCalledWith('u1'));
  expect(startOutbox).toHaveBeenCalledOnce();
});

it('keeps the session when the user cancels logging out with unsent actions', async () => {
  outbox.getSnapshot.mockReturnValue({ items: [{ id: 'a' }, { id: 'b' }] });
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  renderSession();
  await waitFor(() => expect(captured.current?.user).toBeTruthy());
  let result;
  await act(async () => { result = await captured.current.logout(); });
  expect(result).toBe(false);
  expect(confirm.mock.calls[0][0]).toContain('2 acciones sin enviar');
  expect(logoutUser).not.toHaveBeenCalled();
});

it('discards unsent actions and still logs out if clearing them fails', async () => {
  outbox.getSnapshot.mockReturnValue({ items: [{ id: 'a' }] });
  outbox.clearOwner.mockRejectedValue(new Error('storage'));
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  renderSession();
  await waitFor(() => expect(captured.current?.user).toBeTruthy());
  await act(async () => { await captured.current.logout(); });
  expect(outbox.clearOwner).toHaveBeenCalledOnce();
  expect(logoutUser).toHaveBeenCalledOnce();
  expect(captured.current?.user).toBeNull();
});

it('applies a confirmed portrait change to the current user only', async () => {
  outbox.getSnapshot.mockReturnValue({ items: [] });
  renderSession();
  await waitFor(() => expect(captured.current?.user).toBeTruthy());
  const onSynced = useOutboxSynced.mock.calls.at(-1)[0];
  act(() => onSynced({ item: { meta: { kind: 'profile:avatar' } }, data: { userId: 'other', profilePicture: '/x.svg' } }));
  expect(screen.getByText('sin retrato')).toBeTruthy();
  act(() => onSynced({ item: { meta: { kind: 'profile:avatar' } }, data: { userId: 'u1', profilePicture: '/avatars/avatar-2.svg' } }));
  expect(screen.getByText('/avatars/avatar-2.svg')).toBeTruthy();
});
