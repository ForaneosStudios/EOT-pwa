import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ResetPasswordPage from '../../pages/resetPasswordPage.jsx';
import LegalPage from '../../pages/legalPage.jsx';
import { useAuth } from '../auth/authContext.js';
import ProtectedRoute from './ProtectedRoute.jsx';
import LandingPage from '../../pages/landingPage.jsx';
import LoginPage from '../../pages/loginPage.jsx';
import RegisterPage from '../../pages/registerPage.jsx';
import ConfirmationPage from '../../pages/confirmationPage.jsx';
import PasswordPage from '../../pages/passwordPage.jsx';
import ProfilePage from '../../pages/profilePage.jsx';
import AchievementsPage from '../../pages/achievementsPage.jsx';
import ForumPage from '../../pages/forumPage.jsx';
import ForumThreadPage from '../../pages/forumThreadPage.jsx';
import PublicLandingPage from '../../pages/publicLandingPage.jsx';
import ChroniclesPage from '../../pages/chroniclesPage.jsx';
import ArchivePage from '../../pages/archivePage.jsx';
import AdminPage from '../../pages/adminPage.jsx';

function LoginRoute() {
  const { user, setUser, message, setMessage } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  // The page the visitor was heading to before being asked to sign in (same-origin paths only).
  const destination = typeof state?.from === 'string' && state.from.startsWith('/') && !state.from.startsWith('//') ? state.from : '/app';
  // Once the session exists this route re-renders; it must honour the destination as well.
  if (user) return <Navigate to={destination} replace />;
  return <LoginPage message={message} onForgot={() => { void navigate('/auth/forgot-password'); }} onRegister={() => { setMessage(''); void navigate('/register'); }} onLogin={(profile) => { setUser(profile); setMessage(''); void navigate(destination, { replace: true }); }} />;
}

function RegisterRoute() {
  const { user, setUser, setMessage } = useAuth();
  const navigate = useNavigate();
  if (user) return <Navigate to="/app" replace />;
  return <RegisterPage onLogin={(profile) => { setUser(profile); void navigate('/app', { replace: true }); }} onOpenLogin={() => { setMessage(''); void navigate('/login'); }} />;
}

function CallbackRoute({ recovery = false }) {
  const { callbackStatus, setMessage } = useAuth();
  const navigate = useNavigate();
  const onLogin = () => { setMessage(''); void navigate('/login', { replace: true }); };
  if (recovery) return <PasswordPage recovery status={callbackStatus} onLogin={onLogin} />;
  return <ConfirmationPage status={callbackStatus} onLogin={onLogin} />;
}

function useLogoutToLanding() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return async () => {
    if ((await logout()) === false) return;
    void navigate('/', { replace: true });
  };
}

function HomeRoute() {
  const { user, message } = useAuth();
  return <LandingPage user={user} onLogout={useLogoutToLanding()} message={message} />;
}

function ProfileRoute() {
  const { user, message, setUser } = useAuth();
  return <ProfilePage user={user} onLogout={useLogoutToLanding()} onUserUpdate={setUser} message={message} />;
}

function AchievementsRoute() {
  const { user, message } = useAuth();
  return <AchievementsPage user={user} onLogout={useLogoutToLanding()} message={message} />;
}
function ForumRoute() { const { user, message } = useAuth(); return <ForumPage user={user} onLogout={useLogoutToLanding()} message={message} />; }
function ForumThreadRoute() { const { user } = useAuth(); return <ForumThreadPage user={user} onLogout={useLogoutToLanding()} />; }
function AdminRoute() { const { user } = useAuth(); return <AdminPage user={user} onLogout={useLogoutToLanding()} />; }

function ResetPasswordRoute() {
  const { setMessage } = useAuth();
  const navigate = useNavigate();
  return <ResetPasswordPage onDone={(done) => {
    setMessage(done ? 'Contraseña actualizada. Todas tus sesiones se cerraron: inicia sesión de nuevo.' : '');
    void navigate('/login', { replace: true });
  }} onRequestNew={() => { void navigate('/auth/forgot-password', { replace: true }); }} />;
}

function ForgotRoute() {
  const navigate = useNavigate();
  return <PasswordPage onLogin={() => { void navigate('/login'); }} />;
}

export default function AppRouter() {
  return <Routes>
    <Route path="/" element={<PublicLandingPage />} />
    <Route path="/login" element={<LoginRoute />} />
    <Route path="/register" element={<RegisterRoute />} />
    <Route path="/auth/confirm" element={<CallbackRoute />} />
    <Route path="/auth/reset-password" element={<CallbackRoute recovery />} />
    <Route path="/auth/forgot-password" element={<ForgotRoute />} />
    <Route path="/reset-password" element={<ResetPasswordRoute />} />
    <Route path="/terminos" element={<LegalPage document="terminos" />} />
    <Route path="/privacidad" element={<LegalPage document="privacidad" />} />
    <Route element={<ProtectedRoute />}><Route path="/app" element={<HomeRoute />} /><Route path="/achievements" element={<AchievementsRoute />} /><Route path="/chronicles" element={<ChroniclesPage />} /><Route path="/archive" element={<ArchivePage />} /><Route path="/forum" element={<ForumRoute />} /><Route path="/forum/:threadId" element={<ForumThreadRoute />} /><Route path="/profile" element={<ProfileRoute />} /></Route>
    <Route element={<ProtectedRoute roles={['ADMIN']} />}><Route path="/admin" element={<AdminRoute />} /></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
