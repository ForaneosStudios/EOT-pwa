import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChroniclesPage from '../src/pages/chroniclesPage.jsx';

afterEach(cleanup);

it('shows only the first story chapter as demo content', () => {
  render(<MemoryRouter><ChroniclesPage /></MemoryRouter>);
  expect(screen.getByText('El príncipe destronado')).toBeTruthy();
  expect(screen.getByText('Contenido de la demo')).toBeTruthy();
  expect(screen.getAllByText('Sellado')).toHaveLength(4);
});
