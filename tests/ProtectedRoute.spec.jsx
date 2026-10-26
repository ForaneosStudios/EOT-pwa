import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../src/app/auth/authContext.js';
import ProtectedRoute from '../src/app/router/ProtectedRoute.jsx';

afterEach(cleanup);

function renderRoute(auth, roles) {
  return render(<AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/private']}><Routes>
    <Route path="/login" element={<p>Inicio de sesión</p>} />
    <Route element={<ProtectedRoute roles={roles} />}><Route path="/private" element={<p>Contenido privado</p>} /></Route>
  </Routes></MemoryRouter></AuthContext.Provider>);
}

it('waits for session restoration before redirecting', () => {
  renderRoute({ loading: true, user: null });
  expect(screen.getByText('Cargando sesión...')).toBeTruthy();
});

it('redirects unauthenticated visitors to login', () => {
  renderRoute({ loading: false, user: null });
  expect(screen.getByText('Inicio de sesión')).toBeTruthy();
});

it('denies users without the required role', () => {
  renderRoute({ loading: false, user: { role: 'USER' } }, ['ADMIN']);
  expect(screen.getByText('Acceso denegado')).toBeTruthy();
  expect(screen.queryByText('Contenido privado')).toBeNull();
});

it('allows users with the required role', () => {
  renderRoute({ loading: false, user: { role: 'ADMIN' } }, ['ADMIN']);
  expect(screen.getByText('Contenido privado')).toBeTruthy();
});
