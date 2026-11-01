import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../src/pages/landingPage.jsx';
import { apiClient } from '../src/services/apiClient.js';

vi.mock('../src/services/apiClient.js', () => ({ apiClient: { get: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it('uses the current player achievement catalogue and links to the achievement page', async () => {
  apiClient.get.mockResolvedValue({ data: [{ isUnlocked: true }, { isUnlocked: false }, { isUnlocked: true }, { isUnlocked: false }, { isUnlocked: false }, { isUnlocked: false }] });
  render(<MemoryRouter><LandingPage user={{ userId: 'player-1', username: 'Akari03' }} onLogout={vi.fn()} /></MemoryRouter>);

  expect(await screen.findByText('2 / 6')).toBeTruthy();
  expect(screen.getByRole('link', { name: /Salón/i }).getAttribute('href')).toBe('/achievements');
  expect(apiClient.get).toHaveBeenCalledWith('/user-achievements/me', expect.objectContaining({ signal: expect.any(AbortSignal) }));
});
