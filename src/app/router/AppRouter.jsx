import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/authContext.js';
import ProtectedRoute from './ProtectedRoute.jsx';
import LandingPage from '../../pages/landingPage.jsx';
import LoginPage from '../../pages/loginPage.jsx';
import RegisterPage from '../../pages/registerPage.jsx';
import ConfirmationPage from '../../pages/confirmationPage.jsx';
import PasswordPage from '../../pages/passwordPage.jsx';
import ProfilePage from '../../pages/profilePage.jsx';

function LoginRoute() {
  const { setUser, message, setMessage } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const destination = typeof state?.from === 'string' && state.from.startsWith('/') && !state.from.startsWith('//') ? state.from : '/';
  return <LoginPage message={message} onForgot={() => { void navigate('/auth/forgot-password'); }} onRegister={() => { setMessage(''); void navigate('/register'); }} onLogin={(profile) => { setUser(profile); setMessage(''); void navigate(destination, { replace: true }); }} />;
}

function RegisterRoute() {
  const { setUser, setMessage } = useAuth();
  const navigate = useNavigate();
  return <RegisterPage onLogin={(profile) => { setUser(profile); void navigate('/', { replace: true }); }} onOpenLogin={() => { setMessage(''); void navigate('/login'); }} />;
}

function CallbackRoute({ recovery = false }) {
  const { callbackStatus, setMessage } = useAuth();
  const navigate = useNavigate();
  const onLogin = () => { setMessage(''); void navigate('/login', { replace: true }); };
  if (recovery) return <PasswordPage recovery status={callbackStatus} onLogin={onLogin} />;
  return <ConfirmationPage status={callbackStatus} onLogin={onLogin} />;
}

function HomeRoute() {
  const { user, logout, message } = useAuth();
  return <LandingPage user={user} onLogout={logout} message={message} />;
}

function ProfileRoute() {
  const { user, logout, message } = useAuth();
  return <ProfilePage user={user} onLogout={logout} message={message} />;
}

function ForgotRoute() {
  const navigate = useNavigate();
  return <PasswordPage onLogin={() => { void navigate('/login'); }} />;
}

export default function AppRouter() {
  return <Routes>
    <Route path="/login" element={<LoginRoute />} />
    <Route path="/register" element={<RegisterRoute />} />
    <Route path="/auth/confirm" element={<CallbackRoute />} />
    <Route path="/auth/reset-password" element={<CallbackRoute recovery />} />
    <Route path="/auth/forgot-password" element={<ForgotRoute />} />
    <Route element={<ProtectedRoute />}><Route path="/" element={<HomeRoute />} /><Route path="/profile" element={<ProfileRoute />} /></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
