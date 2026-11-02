import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AuthProvider } from '../src/app/auth/AuthProvider.jsx';
import { useAuth } from '../src/app/auth/authContext.js';

vi.mock('../src/services/apiClient.js', () => ({ AUTH_REQUIRED_EVENT: 'auth-required', getApiErrorMessage: () => 'Error' }));
vi.mock('../src/services/authService.js', () => ({
  takeConfirmationResult: () => ({ accessToken: 'a', refreshToken: 'b' }),
  verifyConfirmation: vi.fn().mockResolvedValue(true), restoreUser: vi.fn(), logoutUser: vi.fn(), subscribeToAuthChanges: () => () => {},
}));

afterEach(cleanup);

function Status() {
  const { callbackStatus } = useAuth();
  return <p>{callbackStatus}</p>;
}

it('verifies an email callback and publishes the result', async () => {
  render(<AuthProvider><Status /></AuthProvider>);
  expect(await screen.findByText('success')).toBeTruthy();
});
