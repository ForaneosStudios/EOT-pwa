import { useState } from 'react';
import LandingPage from './pages/landingPage.jsx';
import LoginPage from './pages/loginPage.jsx';
import RegisterPage from './pages/registerPage.jsx';
import { getSession } from './services/authService.js';

function App() {
  const [currentPage, setCurrentPage] = useState(() => (getSession()?.isAuthenticated ? 'landing' : 'register'));
  const session = getSession();

  if (currentPage === 'landing' && session?.isAuthenticated) {
    return <LandingPage user={session.user} />;
  }

  if (currentPage === 'login') {
    return <LoginPage onLogin={() => setCurrentPage('landing')} onRegister={() => setCurrentPage('register')} />;
  }

  return <RegisterPage onLogin={(page = 'landing') => setCurrentPage(page)} />;
}

export default App;
