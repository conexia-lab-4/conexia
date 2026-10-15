import { useEffect, useMemo, useState } from 'react';
import { NavBar } from '../../components/navbar';
import { TextField } from '../../components/textfield';
import { MatchCard } from '../../components/matchCard';
import ConexiaLoader from '../../components/ConexiaLoader';
import { IconSearch } from '../../assets/icons/IconSearch';
import { IconUsersThree } from '../../assets/icons/IconUsersThree';
import { getMatches, type Match } from '../../lib/matchesApi';
import matchesIllustration from '../../assets/images/matches-header.png';
import './index.css';

export function Matches() {
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getMatches()
      .then(setAllMatches)
      .finally(() => setIsLoading(false));
  }, []);

  const filteredMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query === '') return allMatches;

    return allMatches.filter(
      (match) =>
        match.name.toLowerCase().includes(query) ||
        match.career.toLowerCase().includes(query) ||
        match.campus.toLowerCase().includes(query),
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

      {isLoading && (
        <div className="matches__status-message loading-area">
          <ConexiaLoader />
        </div>
      )}

      {!isLoading && (
        <div className="matches__list">
          {filteredMatches.length === 0 ? (
            <p className="matches__empty">
              {search.trim() === ''
                ? 'Todavía no tenés matches.'
                : 'No encontramos resultados para tu búsqueda.'}
            </p>
          ) : (
            filteredMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
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
