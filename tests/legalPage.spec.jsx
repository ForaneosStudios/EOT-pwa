import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LegalPage from '../src/pages/legalPage.jsx';
import { LEGAL_VERSION, legalDocuments } from '../src/content/legal.js';

afterEach(cleanup);

const renderAt = (path) => render(<MemoryRouter initialEntries={['/', path]} initialIndex={1}>
  <Routes>
    <Route path="/" element={<p>Portada</p>} />
    <Route path="/terminos" element={<LegalPage document="terminos" />} />
    <Route path="/privacidad" element={<LegalPage document="privacidad" />} />
  </Routes>
</MemoryRouter>);

it('shows the terms and links to the privacy notice', () => {
  renderAt('/terminos');
  expect(screen.getByRole('heading', { level: 1, name: 'Términos y condiciones' })).toBeTruthy();
  expect(screen.getByText(/Versión del 22 de noviembre de 2026/)).toBeTruthy();
  expect(screen.getByRole('heading', { name: '6. Edad' })).toBeTruthy();
  fireEvent.click(screen.getByRole('link', { name: 'Aviso de privacidad' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Aviso de privacidad' })).toBeTruthy();
});

it('shows the privacy notice with its data table and a back button', () => {
  renderAt('/privacidad');
  expect(screen.getByRole('columnheader', { name: 'Categoría' })).toBeTruthy();
  expect(screen.getByRole('cell', { name: 'Supabase' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: '6. Tus derechos (ARCO)' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '← Volver' }));
  expect(screen.getByText('Portada')).toBeTruthy();
});

it('keeps both documents under the same version', () => {
  expect(legalDocuments.terminos.updated).toBe(LEGAL_VERSION);
  expect(legalDocuments.privacidad.updated).toBe(LEGAL_VERSION);
});
