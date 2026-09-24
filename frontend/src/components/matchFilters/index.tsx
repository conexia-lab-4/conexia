import './index.css';

export type MatchFilterValue =
  | 'todos'
  | 'misma-sede'
  | 'misma-carrera'
  | 'mismos-horarios';

interface FilterOption {
  value: MatchFilterValue;
  label: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'misma-sede', label: 'Misma sede' },
  { value: 'misma-carrera', label: 'Misma carrera' },
  { value: 'mismos-horarios', label: 'Mismos Horarios' },
];

interface MatchFiltersProps {
  active: MatchFilterValue;
  onChange: (value: MatchFilterValue) => void;
}

export function MatchFilters({ active, onChange }: MatchFiltersProps) {
  return (
    <div className="match-filters" role="group" aria-label="Filtros de matches">
      {FILTER_OPTIONS.map(({ value, label }) => {
        const isActive = value === active;
        return (
          <button
            key={value}
            type="button"
            className={`match-filters__pill${isActive ? ' match-filters__pill--active' : ''}`}
            aria-pressed={isActive}
            onClick={() => onChange(value)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default MatchFilters;