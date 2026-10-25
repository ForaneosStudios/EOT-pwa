import { useEffect, useState } from 'react';
import LandingPage from './pages/landingPage.jsx';
import LoginPage from './pages/loginPage.jsx';
import RegisterPage from './pages/registerPage.jsx';
import ConfirmationPage from './pages/confirmationPage.jsx';
import {
  logoutUser,
  restoreUser,
  subscribeToAuthChanges,
  takeConfirmationResult,
  verifyConfirmation,
} from './services/authService.js';
import { AUTH_REQUIRED_EVENT, getApiErrorMessage } from './services/apiClient.js';

// Read once, before any component renders or React Strict Mode repeats effects.
const confirmationResult = takeConfirmationResult();
let confirmationPromise;
function checkConfirmation() {
  confirmationPromise ??= verifyConfirmation(confirmationResult);
  return confirmationPromise;
}

function App() {
  const [currentPage, setCurrentPage] = useState(confirmationResult ? 'confirmation' : 'loading');
  const [confirmationStatus, setConfirmationStatus] = useState('checking');
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    if (confirmationResult) {
      checkConfirmation().then((success) => {
        if (active) setConfirmationStatus(success ? 'success' : 'error');
      }).catch(() => { if (active) setConfirmationStatus('error'); });
    } else {
      restoreUser().then((profile) => {
        if (!active) return;
        setUser(profile);
        setCurrentPage(profile ? 'landing' : 'register');
      }).catch((error) => {
        if (!active) return;
        setMessage(getApiErrorMessage(error, 'No se pudo recuperar la sesión. Inicia sesión de nuevo.'));
        setCurrentPage('login');
      });
    }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const requireLogin = () => {
      setUser(null);
      setMessage('Tu sesiÃ³n terminÃ³. Inicia sesiÃ³n nuevamente.');
      setCurrentPage('login');
    };
    const unsubscribe = subscribeToAuthChanges((event) => {
      if (event === 'SIGNED_OUT') requireLogin();
    });
    window.addEventListener(AUTH_REQUIRED_EVENT, requireLogin);
    return () => {
      unsubscribe();
      window.removeEventListener(AUTH_REQUIRED_EVENT, requireLogin);
    };
  }, []);

  const openLogin = () => {
    window.history.replaceState(null, '', '/');
    setMessage('');
    setCurrentPage('login');
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      openLogin();
    } catch (error) {
      setMessage(getApiErrorMessage(error, 'No se pudo cerrar la sesión. Inténtalo de nuevo.'));
    }
  };

  if (currentPage === 'loading') return <main className="min-h-screen bg-void p-8 text-parchment">Cargando sesión...</main>;
  if (currentPage === 'confirmation') return <ConfirmationPage status={confirmationStatus} onLogin={openLogin} />;
  if (currentPage === 'landing' && user) return <LandingPage user={user} onLogout={handleLogout} message={message} />;
  if (currentPage === 'login') return <LoginPage message={message} onLogin={(profile) => { setUser(profile); setMessage(''); setCurrentPage('landing'); }} onRegister={() => { setMessage(''); setCurrentPage('register'); }} />;
  return <RegisterPage onLogin={(profile) => { setUser(profile); setCurrentPage('landing'); }} onOpenLogin={openLogin} />;
}

export default App;
