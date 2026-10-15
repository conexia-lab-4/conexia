import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { NavBar } from '../../components/navbar';
import { TextField } from '../../components/textfield';
import { MatchCard } from '../../components/matchCard';
import ConexiaLoader from '../../components/ConexiaLoader';
import { IconSearch } from '../../assets/icons/IconSearch';
import { IconUsersThree } from '../../assets/icons/IconUsersThree';
import { getMatches, type Match } from '../../lib/matchesApi';
import matchesIllustration from '../../assets/images/matches-header.png';
import './index.css';

type LoadStatus = 'loading' | 'ready' | 'error';

export function Matches() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;

    let ignore = false;

    getMatches()
      .then((data) => {
        if (ignore) return;
        setAllMatches(data);
        setStatus('ready');
      })
      .catch((error) => {
        if (ignore) return;
        console.error('Error al cargar los matches:', error);
        setStatus('error');
      });

    return () => {
      ignore = true;
    };
  }, [user, reloadKey]);

  const handleRetry = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  const filteredMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query === '') return allMatches;

    return allMatches.filter((match) =>
      [match.name, match.career, match.campus].some((value) =>
        value?.toLowerCase().includes(query),
      ),
    );
  }, [allMatches, search]);

  return (
    <div className="matches">
      <header className="matches__header">
        <div className="matches__heading">
          <h1 className="text-h4-bold">Matches</h1>
          <p className="matches__subtitle text-body-2">
            Encontrá estudiantes compatibles para compartir viajes y clases.
          </p>
        </div>
        <img
          src={matchesIllustration}
          alt=""
          className="matches__illustration"
        />
      </header>

      <TextField
        placeholder="Buscar por nombre, carrera o sede..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<IconSearch size={20} color="var(--color-grey-400)" />}
      />

      {status === 'loading' && (
        <div className="matches__status-message loading-area">
          <ConexiaLoader />
        </div>
      )}

      {status === 'error' && (
        <div className="matches__status-message matches__status-message--error">
          <p>No pudimos cargar tus matches. Intentá de nuevo más tarde.</p>
          <button
            type="button"
            className="matches__retry-button"
            onClick={handleRetry}
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'ready' && (
        <div className="matches__list">
          {filteredMatches.length === 0 ? (
            <p className="matches__empty">
              {search.trim() === ''
                ? 'Todavía no tenés matches.'
                : 'No encontramos resultados para tu búsqueda.'}
            </p>
          ) : (
            filteredMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onClick={() => navigate(`/matches/${match.id}`)}
              />
            ))
          )}
        </div>
      )}

      <div className="matches__info">
        <div className="matches__info-icon">
          <IconUsersThree size={24} color="var(--color-info-callout-icon)" />
        </div>
        <div className="matches__info-text">
          <span className="matches__info-title">¿Cómo funciona?</span>
          <p className="matches__info-body">
            Te mostramos estudiantes con intereses, horarios y rutas compatibles
          </p>
        </div>
      </div>

      <NavBar activeItem="matches" />
    </div>
  );
}

export default Matches;
