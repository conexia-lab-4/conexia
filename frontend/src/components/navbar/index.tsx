import { useNavigate } from 'react-router-dom';
import { IconHome } from '../../assets/icons/IconHome';
import { IconCalendar } from '../../assets/icons/IconCalendar';
import { IconUsersThree } from '../../assets/icons/IconUsersThree';
import { IconCar } from '../../assets/icons/IconCar';
import { IconUser } from '../../assets/icons/IconUser';
import './index.css';

export type NavItemId = 'home' | 'horarios' | 'matches' | 'viajes' | 'perfil';

interface NavBarProps {
  activeItem: NavItemId;
}

const NAV_ITEMS: {
  id: NavItemId;
  label: string;
  Icon: typeof IconHome;
  path: string | null;
}[] = [
  { id: 'home', label: 'Home', Icon: IconHome, path: '/home' },
  { id: 'horarios', label: 'Horarios', Icon: IconCalendar, path: '/schedule' },
  { id: 'matches', label: 'Matches', Icon: IconUsersThree, path: null },
  { id: 'viajes', label: 'Viajes', Icon: IconCar, path: null },
  { id: 'perfil', label: 'Mi Perfil', Icon: IconUser, path: null },
];

export function NavBar({ activeItem }: NavBarProps) {
  const navigate = useNavigate();

  return (
    <nav className="nav-bar">
      {NAV_ITEMS.map(({ id, label, Icon, path }) => {
        const isActive = id === activeItem;
        return (
          <button
            key={id}
            type="button"
            className={`nav-bar__item${isActive ? ' nav-bar__item--active' : ''}`}
            onClick={() => path && navigate(path)}
            disabled={!path}
          >
            <Icon
              size={24}
              color={
                isActive
                  ? 'var(--color-primary-100)'
                  : 'var(--color-primary-900)'
              }
            />
            {isActive && <span className="nav-bar__label">{label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
