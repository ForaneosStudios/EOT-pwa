import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PwaStatus from '../src/components/pwa/PwaStatus.jsx';
import { usePwaInstall } from '../src/components/pwa/pwaInstallContext.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function InstallButton() {
  const { canInstall, install, installing } = usePwaInstall();
  return canInstall && <button type="button" disabled={installing} onClick={install}>{installing ? 'Abriendo' : 'Instalar app'}</button>;
}

it('shows and clears the offline notice when connection changes', () => {
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  render(<PwaStatus />);
  expect(screen.getByText(/Sin conexión/)).toBeTruthy();
  online.mockReturnValue(true);
  act(() => window.dispatchEvent(new Event('online')));
  expect(screen.queryByText(/Sin conexión/)).toBeNull();
});

it('makes installation available to its children only when supported', async () => {
  render(<PwaStatus><InstallButton /></PwaStatus>);
  expect(screen.queryByRole('button', { name: 'Instalar app' })).toBeNull();
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = vi.fn().mockResolvedValue({ outcome: 'accepted' });
  act(() => window.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Instalar app' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Instalar app' })).toBeNull());
  expect(event.prompt).toHaveBeenCalledOnce();
});

it('clears an installation offer if the app is installed elsewhere', () => {
  render(<PwaStatus><InstallButton /></PwaStatus>);
  act(() => window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true })));
  expect(screen.getByRole('button', { name: 'Instalar app' })).toBeTruthy();
  act(() => window.dispatchEvent(new Event('appinstalled')));
  expect(screen.queryByRole('button', { name: 'Instalar app' })).toBeNull();
});
