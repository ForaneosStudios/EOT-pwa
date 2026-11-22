import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { AuthContext } from '../src/app/auth/authContext.js';
import { LiveUpdatesProvider } from '../src/app/live/LiveUpdatesProvider.jsx';
import RecordsPanel from '../src/components/landing/recordsPanel.jsx';
import { apiClient } from '../src/services/apiClient.js';
import { formatRunTime } from '../src/services/runTime.js';

vi.mock('../src/services/apiClient.js', () => ({ apiClient: { get: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

function answer({ best, ranking }) {
  apiClient.get.mockImplementation((url) => Promise.resolve({ data: url === '/time-records/me' ? { timeMs: best } : ranking }));
}

function renderLive(user = { userId: 'u1', username: 'Akari03' }) {
  let emit;
  const connect = vi.fn(({ onEvent }) => { emit = onEvent; return vi.fn(); });
  const view = render(<AuthContext.Provider value={{ user }}><LiveUpdatesProvider connect={connect}><RecordsPanel user={user} /></LiveUpdatesProvider></AuthContext.Provider>);
  return { connect, emit: (event) => act(() => emit(event)), view };
}

describe('run time format', () => {
  it('formats minutes, hours and missing values', () => {
    expect(formatRunTime(83456)).toBe('1:23.456');
    expect(formatRunTime(3723004)).toBe('1:02:03.004');
    expect(formatRunTime(0)).toBe('—');
    expect(formatRunTime(undefined)).toBe('—');
  });
});

describe('records panel', () => {
  it('shows the best time and ranking, and refreshes when the game saves a record', async () => {
    answer({ best: 90000, ranking: [{ rank: 1, username: 'Rival', bestTimeMs: 80000 }, { rank: 2, username: 'Akari03', bestTimeMs: 90000 }] });
    const { emit, connect } = renderLive();
    expect(await screen.findByText('1:30.000', { selector: 'p' })).toBeTruthy();
    expect(screen.getByText('Akari03 (tú)')).toBeTruthy();
    expect(connect).toHaveBeenCalledOnce();
    expect(apiClient.get).toHaveBeenCalledWith('/leaderboard', expect.objectContaining({ params: { limit: 10 } }));

    answer({ best: 70000, ranking: [{ rank: 1, username: 'Akari03', bestTimeMs: 70000 }, { rank: 2, username: 'Rival', bestTimeMs: 80000 }] });
    emit({ type: 'record', data: { bestTimeMs: 70000 } });
    expect(await screen.findByText('1:10.000', { selector: 'p' })).toBeTruthy();

    const calls = apiClient.get.mock.calls.length;
    emit({ type: 'achievements', data: {} });
    expect(apiClient.get.mock.calls.length).toBe(calls);
    emit({ type: 'resync', data: {} });
    expect(apiClient.get.mock.calls.length).toBe(calls + 2);
  });

  it('handles players without a record, an empty ranking and errors', async () => {
    answer({ best: undefined, ranking: [{ isUnlocked: true }] });
    renderLive();
    expect(await screen.findByText('Aún sin récord')).toBeTruthy();
    expect(screen.getByText(/Nadie ha completado/)).toBeTruthy();
    cleanup();

    apiClient.get.mockRejectedValue(new Error('down'));
    renderLive();
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('opens no stream while signed out', () => {
    answer({ best: undefined, ranking: [] });
    const { connect } = renderLive(null);
    expect(connect).not.toHaveBeenCalled();
  });
});
