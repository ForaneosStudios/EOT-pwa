import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ArchivePage from '../src/pages/archivePage.jsx';

afterEach(cleanup);

it('filters conceptual art and exposes discarded ideas', () => {
  render(<MemoryRouter><ArchivePage /></MemoryRouter>);
  expect(screen.getByText('El Heredero sin rostro')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Criaturas/i }));
  expect(screen.getByText('La bestia de las grietas')).toBeTruthy();
  expect(screen.queryByText('El Heredero sin rostro')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Ver ideas descartadas/i }));
  expect(screen.getByText('La corrupción observa')).toBeTruthy();
  expect(screen.getByText('Medir el poder')).toBeTruthy();
});
