import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { getSubjects } from '../../lib/subjectsApi';
import { StatCard } from '../../components/statcard';
import { NavBar } from '../../components/navbar';
import { IconBooks } from '../../assets/icons/IconBooks';
import { IconUsersThree } from '../../assets/icons/IconUsersThree';
import { IconCarFront } from '../../assets/icons/IconCarFront';
import { IconRoute } from '../../assets/icons/IconRoute';
import { IconHandWave } from '../../assets/icons/IconHandWave';
import calendarHeader from '../../assets/images/calendar-header.png';
import './index.css';

export function Home() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      setDisplayName(user.displayName);

      try {
        const subjects = await getSubjects();
        setSubjectsCount(subjects.length);
      } catch (error) {
        console.error('Error al obtener materias:', error);
        setLoadError('No se pudieron cargar tus materias.');
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="home">
      <header className="home__header">
        <div className="home__greeting">
          <div className="home__greeting-title">
            <h1 className="text-h4-bold">
              ¡Hola, {displayName ?? 'Estudiante'}!
            </h1>
            <IconHandWave size={25} />
          </div>
          <p className="home__greeting-subtitle">
            Organizá tu semana y conectá con otros estudiantes
          </p>
        </div>
        <img src={calendarHeader} alt="" className="home__calendar-image" />
      </header>

      {loadError && <p className="home__error">{loadError}</p>}

      <section className="home__stats">
        <StatCard
          label="Mis Clases"
          value={subjectsCount}
          icon={<IconBooks color="var(--color-primary-700)" />}
          iconBgColor="var(--color-primary-100)"
        />
        <StatCard
          label="Matches"
          value={0}
          icon={<IconUsersThree color="var(--color-primary-700)" />}
          iconBgColor="var(--color-primary-200)"
        />
        <StatCard
          label="Viajes Pendientes"
          value={0}
          icon={<IconCarFront color="var(--color-primary-700)" />}
          iconBgColor="var(--color-stat-icon-pending-bg)"
        />
        <StatCard
          label="Total viajes"
          value={0}
          icon={<IconRoute color="var(--color-primary-700)" />}
          iconBgColor="var(--color-stat-icon-total-bg)"
        />
      </section>

      <section className="home__trips">
        <h2 className="home__trips-title">Próximos viajes</h2>
        <p className="home__trips-empty">Próximamente</p>
      </section>

      <NavBar activeItem="home" />
    </div>
  );
}
