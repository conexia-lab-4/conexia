import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { getSubjects } from '../../lib/subjectsApi';
import { getProfile, type ProfileResponse } from '../../lib/profileApi';
import { StatCard } from '../../components/statcard';
import { NavBar } from '../../components/navbar';
import { ProfilePendingCard } from '../../components/profilependingcard';
import { EmptyTripsState } from '../../components/emptytripsstate';
import { IconBooks } from '../../assets/icons/IconBooks';
import { IconUsersThree } from '../../assets/icons/IconUsersThree';
import { IconCarFront } from '../../assets/icons/IconCarFront';
import { IconRoute } from '../../assets/icons/IconRoute';
import { IconHandWave } from '../../assets/icons/IconHandWave';
import calendarHeader from '../../assets/images/calendar-header.png';
import './index.css';

function countCompletedSteps(profile: ProfileResponse | null): number {
  if (!profile) return 0;
  const step1 = Boolean(profile.university);
  const step2 = Boolean(profile.career && profile.year && profile.campus);
  const step3 = profile.hasCar !== null;
  return [step1, step2, step3].filter(Boolean).length;
}

type LoadStatus = 'loading' | 'ready' | 'error';

export function Home() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      setDisplayName(user.displayName?.split(' ')[0] ?? null);

      try {
        const [subjects, profileData] = await Promise.all([
          getSubjects(),
          getProfile(),
        ]);
        setSubjectsCount(subjects.length);
        setProfile(profileData);
        setStatus('ready');
      } catch (error) {
        console.error('Error al cargar datos del Home:', error);
        setStatus('error');
      }
    });

    return () => unsubscribe();
  }, []);

  const completedSteps = countCompletedSteps(profile);
  const questionnaireCompleted = profile?.questionnaireCompleted ?? false;

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

      {status === 'loading' && (
        <p className="home__status-message">Cargando...</p>
      )}

      {status === 'error' && (
        <p className="home__status-message home__status-message--error">
          No pudimos cargar tu información. Intentá de nuevo más tarde.
        </p>
      )}

      {status === 'ready' && (
        <>
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

          {!questionnaireCompleted && (
            <div className="home__profile-pending">
              <ProfilePendingCard
                completedSteps={completedSteps}
                totalSteps={3}
              />
            </div>
          )}

          <section className="home__trips">
            <h2 className="home__trips-title">Próximos viajes</h2>
            <div className="home__trips-content">
              <EmptyTripsState />
            </div>
          </section>
        </>
      )}

      <NavBar activeItem="home" />
    </div>
  );
}
