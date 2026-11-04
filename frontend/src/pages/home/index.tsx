import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { getSubjects } from '../../lib/subjectsApi';
import { getProfile, type ProfileResponse } from '../../lib/profileApi';
import { getMyTrips, type TripDetail } from '../../lib/tripsApi';
import { getTravelMatches } from '../../lib/matchesApi';
import { StatCard } from '../../components/statcard';
import { NavBar } from '../../components/navbar';
import { ProfilePendingCard } from '../../components/profilependingcard';
import { EmptyTripsState } from '../../components/emptytripsstate';
import { TripListCard } from '../../components/triplistcard';
import { PublishTripCard } from '../../components/publishtripcard';
import { QuickActionsDrawer } from '../../components/quickactionsdrawer';
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
  const [matchesCount, setMatchesCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [upcomingTrips, setUpcomingTrips] = useState<TripDetail[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
      const [subjects, profileData, trips, historyTrips, matches] =
        await Promise.all([
          getSubjects(),
          getProfile(),
          getMyTrips('upcoming'),
          getMyTrips('history'),
          getTravelMatches(),
        ]);
      setSubjectsCount(subjects.length);
      setProfile(profileData);
      setUpcomingTrips(trips);
      setHistoryCount(historyTrips.length);
      setMatchesCount(matches.length);
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
        <div className="home__status-message loading-area">
          <ConexiaLoader />
        </div>
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
              value={matchesCount}
              icon={<IconUsersThree color="var(--color-primary-700)" />}
              iconBgColor="var(--color-primary-200)"
            />
            <StatCard
              label="Viajes Pendientes"
              value={upcomingTrips.length}
              icon={<IconCarFront color="var(--color-primary-700)" />}
              iconBgColor="var(--color-stat-icon-pending-bg)"
            />
            <StatCard
              label="Total viajes"
              value={upcomingTrips.length + historyCount}
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

          <div className="home__publish-card">
            <PublishTripCard
              hasCar={Boolean(profile?.hasCar)}
              onPublish={() => setIsDrawerOpen(true)}
            />
          </div>

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

      {isDrawerOpen && (
        <QuickActionsDrawer
          hasCar={Boolean(profile?.hasCar)}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}

      <NavBar activeItem="home" />
    </div>
  );
}
