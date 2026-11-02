import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/authContext.js';

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main className="min-h-screen bg-void p-8 text-parchment">Cargando sesión...</main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <main className="min-h-screen bg-void p-8 text-parchment"><h1>Acceso denegado</h1><p>No tienes permiso para acceder a esta sección.</p></main>;
  return <Outlet />;
}
