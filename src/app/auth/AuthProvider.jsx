import { useEffect, useState } from 'react';
import { AuthContext } from './authContext.js';
import { AUTH_REQUIRED_EVENT, getApiErrorMessage } from '../../services/apiClient.js';
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

  async function logout() {
    try {
      await logoutUser();
      setUser(null);
      setMessage('');
    } catch (error) {
      setMessage(getApiErrorMessage(error, 'No se pudo cerrar la sesión. Inténtalo de nuevo.'));
    }
  }

  return <AuthContext.Provider value={{ user, setUser, loading, message, setMessage, callbackStatus, logout }}>{children}</AuthContext.Provider>;
}
