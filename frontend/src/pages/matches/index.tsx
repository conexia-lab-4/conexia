import { useEffect, useMemo, useState } from 'react';
import { NavBar } from '../../components/navbar';
import { TextField } from '../../components/textfield';
import { MatchFilters, type MatchFilterValue } from '../../components/matchFilters';
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
  const [filter, setFilter] = useState<MatchFilterValue>('todos');

  useEffect(() => {
    getMatches()
      .then(setAllMatches)
      .finally(() => setIsLoading(false));
  }, []);

  const filteredMatches = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allMatches.filter((match) => {
      const matchesSearch =
        query === '' ||
        match.name.toLowerCase().includes(query) ||
        match.career.toLowerCase().includes(query) ||
        match.campus.toLowerCase().includes(query);

      const matchesFilter =
        filter === 'todos' ||
        (filter === 'misma-sede' && match.sameCampus) ||
        (filter === 'misma-carrera' && match.sameCareer) ||
        (filter === 'mismos-horarios' && match.hasSimilarSchedule);

      return matchesSearch && matchesFilter;
    });
  }, [allMatches, search, filter]);

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

      <MatchFilters active={filter} onChange={setFilter} />

      {isLoading && (
        <p className="matches__status-message">
          <ConexiaLoader />
        </p>
      )}

      {!isLoading && (
        <div className="matches__list">
          {filteredMatches.length === 0 ? (
            <p className="matches__empty">
              No encontramos estudiantes con esos filtros.
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
            Te mostramos estudiantes con intereses, horarios y rutas
            compatibles
          </p>
        </div>
      </div>

      <NavBar activeItem="matches" />
    </div>
  );
}

export default Matches;