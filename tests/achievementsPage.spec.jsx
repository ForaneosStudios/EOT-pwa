import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AchievementsPage from '../src/pages/achievementsPage.jsx';
import { apiClient } from '../src/services/apiClient.js';

vi.mock('../src/services/apiClient.js', () => ({
  apiClient: { get: vi.fn() },
  getApiErrorMessage: () => 'No se pudieron cargar los logros.',
}));

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

const achievements = [
  { achId: 'one', achName: 'El primer despertar', achDescription: 'Comienza tu viaje.', isUnlocked: true, isAchHidden: false },
  { achId: 'two', achName: 'Recolector de almas', achDescription: 'Reúne almas.', achPicture: 'https://example.com/souls.png', targetValue: 10, progressLabel: 'almas', progress: 10, isUnlocked: true, isAchHidden: false },
  { achId: 'three', achName: 'Logro oculto', achDescription: null, isUnlocked: false, isAchHidden: true },
];

function renderPage() {
  render(<MemoryRouter initialEntries={['/achievements']}><AchievementsPage user={{ userId: '123' }} onLogout={vi.fn()} /></MemoryRouter>);
}

it('renders real achievement progress and keeps locked secrets masked', async () => {
  apiClient.get.mockResolvedValue({ data: achievements });
  renderPage();
  expect(await screen.findByText('2 de 3 logros desbloqueados')).toBeTruthy();
  expect(screen.getByText('El primer despertar')).toBeTruthy();
  expect(screen.getByText('10 / 10 almas')).toBeTruthy();
  expect(screen.getByText('Secreto por descubrir.')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Logros' }).getAttribute('aria-current')).toBe('page');
});

it('filters the achievement catalogue', async () => {
  apiClient.get.mockResolvedValue({ data: achievements });
  renderPage();
  await screen.findByText('2 de 3 logros desbloqueados');
  fireEvent.click(screen.getByRole('tab', { name: 'Bloqueados' }));
  expect(screen.queryByText('El primer despertar')).toBeNull();
  expect(screen.getByText('Logro oculto')).toBeTruthy();
});
