import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from './authContext.js';
import { AUTH_REQUIRED_EVENT, getApiErrorMessage } from '../../services/apiClient.js';
import { outbox } from '../../services/offline/index.js';
import { logoutUser, restoreUser, subscribeToAuthChanges, takeConfirmationResult, verifyConfirmation } from '../../services/authService.js';

// Capture and remove one-use URL tokens before rendering the application.
const callback = takeConfirmationResult();
let callbackPromise;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!callback);
  const [callbackStatus, setCallbackStatus] = useState('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    if (callback) {
      callbackPromise ??= verifyConfirmation(callback);
      callbackPromise.then((success) => {
        if (active) setCallbackStatus(success ? 'success' : 'error');
      }).catch(() => { if (active) setCallbackStatus('error'); });
    } else {
      restoreUser().then((profile) => {
        if (active) setUser(profile);
      }).catch((error) => {
        if (active) setMessage(getApiErrorMessage(error, 'No se pudo recuperar la sesión.'));
      }).finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const requireLogin = () => {
      setUser(null);
      setMessage('Tu sesión terminó. Inicia sesión nuevamente.');
    };
    const unsubscribe = subscribeToAuthChanges((event) => {
      if (event === 'SIGNED_OUT') requireLogin();
    });
    window.addEventListener(AUTH_REQUIRED_EVENT, requireLogin);
    return () => { unsubscribe(); window.removeEventListener(AUTH_REQUIRED_EVENT, requireLogin); };
  }, []);

  // True while the player is signing out on purpose. Supabase announces SIGNED_OUT while signOut() is
  // still running, which clears the user before the app can navigate; protected pages read this flag
  // to send the player to the landing instead of the login form.
  // It stays set until the next sign-in: React Router applies the navigation to the landing a moment
  // after the session is cleared, and the protected page must not redirect to /login in between.
  const signingOut = useRef(false);
  const isSigningOut = useCallback(() => signingOut.current, []);
  useEffect(() => { if (user) signingOut.current = false; }, [user]);

  // Returns false when the user keeps the session to avoid losing unsent actions.
  const logout = useCallback(async () => {
    const unsent = outbox.getSnapshot().items.length;
    if (unsent > 0) {
      const noun = unsent === 1 ? 'acción sin enviar' : 'acciones sin enviar';
      if (!window.confirm(`Tienes ${unsent} ${noun}. Si cierras sesión se descartarán de este dispositivo. ¿Cerrar sesión?`)) {
        return false;
      }
    }
    signingOut.current = true;
    try {
      await outbox.clearOwner();
    } catch {
      // Signing out matters more; the next account to sign in removes leftovers anyway.
    }
    try {
      await logoutUser();
      setUser(null);
      setMessage('');
    } catch (error) {
      signingOut.current = false; // still signed in
      setMessage(getApiErrorMessage(error, 'No se pudo cerrar la sesión. Inténtalo de nuevo.'));
    }
  }, []);

  const value = useMemo(() => ({ user, setUser, loading, message, setMessage, callbackStatus, logout, isSigningOut }),
    [user, loading, message, callbackStatus, logout, isSigningOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
