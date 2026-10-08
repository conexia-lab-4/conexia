import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { getSubjects } from '../../lib/subjectsApi';
import { getProfile, type ProfileResponse } from '../../lib/profileApi';
import { getUpcomingTrips, type TripDetail } from '../../lib/tripsApi';
import { StatCard } from '../../components/statcard';
import { NavBar } from '../../components/navbar';
import { ProfilePendingCard } from '../../components/profilependingcard';
import { EmptyTripsState } from '../../components/emptytripsstate';
import { TripListCard } from '../../components/triplistcard';
import { IconBooks } from '../../assets/icons/IconBooks';
import { IconUsersThree } from '../../assets/icons/IconUsersThree';
import { IconCarFront } from '../../assets/icons/IconCarFront';
import { IconRoute } from '../../assets/icons/IconRoute';
import { IconHandWave } from '../../assets/icons/IconHandWave';
import calendarHeader from '../../assets/images/calendar-header.png';
import './index.css';
import ConexiaLoader from '../../components/ConexiaLoader';

function countCompletedSteps(profile: ProfileResponse | null): number {
  if (!profile) return 0;
  const step1 = Boolean(profile.university);
  const step2 = Boolean(profile.career && profile.year && profile.campus);
  const step3 = profile.hasCar !== null;
  return [step1, step2, step3].filter(Boolean).length;
}

type LoadStatus = 'loading' | 'ready' | 'error';

// Cantidad de viajes que se muestran en Home; el resto se ve en /trips
const HOME_TRIPS_LIMIT = 3;

export function Home() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [upcomingTrips, setUpcomingTrips] = useState<TripDetail[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const location = useLocation();
  const navigate = useNavigate();
  const [tripPublished] = useState(
    () => (location.state as { tripPublished?: boolean } | null)?.tripPublished,
  );

  // Se limpia el state para que el aviso no vuelva a aparecer al recargar
  useEffect(() => {
    if (tripPublished) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [tripPublished, navigate, location.pathname]);

  const loadHomeData = useCallback(async () => {
    setStatus('loading');
    try {
      const [subjects, profileData, trips] = await Promise.all([
        getSubjects(),
        getProfile(),
        getUpcomingTrips(),
      ]);
      setSubjectsCount(subjects.length);
      setProfile(profileData);
      setUpcomingTrips(trips);
      setStatus('ready');
    } catch (error) {
      console.error('Error al cargar datos del Home:', error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      setDisplayName(user.displayName?.split(' ')[0] ?? null);
      loadHomeData();
    });

    return () => unsubscribe();
  }, [loadHomeData]);

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

      {tripPublished && (
        <p className="home__success-message" role="status">
          ¡Tu viaje se publicó! Otros estudiantes ya pueden verlo.
        </p>
      )}

      {status === 'loading' && (
        <p className="home__status-message">
          <ConexiaLoader></ConexiaLoader>
        </p>
      )}

      {status === 'error' && (
        <div className="home__status-message home__status-message--error">
          <p>No pudimos cargar tu información. Intentá de nuevo más tarde.</p>
          <button
            type="button"
            className="home__retry-button"
            onClick={loadHomeData}
          >
            Reintentar
          </button>
        </div>
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
            <div className="home__trips-header">
              <h2 className="home__trips-title">Próximos viajes</h2>
              {upcomingTrips.length > HOME_TRIPS_LIMIT && (
                <Link to="/trips" className="home__trips-link">
                  Ver todos
                </Link>
              )}
            </div>
            {upcomingTrips.length === 0 ? (
              <div className="home__trips-content">
                <EmptyTripsState />
              </div>
            ) : (
              <ul className="home__trips-list">
                {upcomingTrips.slice(0, HOME_TRIPS_LIMIT).map((trip) => (
                  <li key={trip.id}>
                    <TripListCard trip={trip} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <NavBar activeItem="home" />
    </div>
  );
}
