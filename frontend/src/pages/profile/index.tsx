import { useAuth } from '../../context/authContext';
import './index.css';

export function Profile() {
  const { logout } = useAuth();

  return (
    <div className="profile">
      <button type="button" className="profile__logout" onClick={logout}>
        Cerrar sesión
      </button>
    </div>
  );
}
