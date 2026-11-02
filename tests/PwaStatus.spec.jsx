import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PwaStatus from '../src/components/pwa/PwaStatus.jsx';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('shows and clears the offline notice when connection changes', () => {
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  render(<PwaStatus />);
  expect(screen.getByText(/Sin conexión/)).toBeTruthy();
  online.mockReturnValue(true);
  act(() => window.dispatchEvent(new Event('online')));
  expect(screen.queryByText(/Sin conexión/)).toBeNull();
});

it('offers installation only when the browser supports it', async () => {
  render(<PwaStatus />);
  expect(screen.queryByText('Instalar')).toBeNull();
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = vi.fn().mockResolvedValue({ outcome: 'accepted' });
  act(() => window.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Instalar' }));
  await waitFor(() => expect(screen.queryByText('Instalar')).toBeNull());
  expect(event.prompt).toHaveBeenCalledOnce();
});

it('allows dismissing an installation offer', () => {
  render(<PwaStatus />);
  act(() => window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true })));
  fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
  expect(screen.queryByText('Instalar')).toBeNull();
});

it('clears an offer if the app is installed elsewhere', () => {
  render(<PwaStatus />);
  act(() => window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true })));
  act(() => window.dispatchEvent(new Event('appinstalled')));
  expect(screen.queryByText('Instalar')).toBeNull();
});
