import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import './index.css';

interface RequireAuthProps {
  requireVerified?: boolean;
  blockIfVerified?: boolean;
}

export function RequireAuth({
  requireVerified = false,
  blockIfVerified = false,
}: RequireAuthProps) {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <div className="require-auth__loading">Cargando…</div>;
  }

  if (status === 'unauthed' || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireVerified && !user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (blockIfVerified && user.emailVerified) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
