import { IconPlus } from '../../assets/icons/IconPlus';
import { TimeField } from '../timefield';
import { DAY_OPTIONS, type DayValue } from '../dayselector/constants';
import './index.css';

export type TimeRange = { start: string; end: string };
export type SchedulesByDay = Partial<Record<DayValue, TimeRange[]>>;

interface ScheduleSectionProps {
  selectedDays: DayValue[];
  schedules: SchedulesByDay;
  onChangeRange: (
    day: DayValue,
    index: number,
    field: 'start' | 'end',
    value: string,
  ) => void;
  onAddRange: (day: DayValue) => void;
  onRemoveRange: (day: DayValue, index: number) => void;
}

const dayLabel = (day: DayValue) =>
  DAY_OPTIONS.find((d) => d.value === day)?.label ?? day;

export function ScheduleSection({
  selectedDays,
  schedules,
  onChangeRange,
  onAddRange,
  onRemoveRange,
}: ScheduleSectionProps) {
  if (selectedDays.length === 0) return null;

  const orderedDays = DAY_OPTIONS.map((d) => d.value).filter((d) =>
    selectedDays.includes(d),
  );

  return (
    <div className="schedule-section">
      {orderedDays.map((day) => {
        const ranges = schedules[day] ?? [{ start: '', end: '' }];
        return (
          <div key={day} className="schedule-section__day">
            <span className="schedule-section__day-label text-body-3">
              {dayLabel(day)}
            </span>

            {ranges.map((range, index) => (
              <div key={index} className="schedule-section__row">
                <div className="schedule-section__field">
                  <span className="schedule-section__field-label text-body-3">
                    Hora de inicio
                  </span>
                  <TimeField
                    value={range.start}
                    onChange={(v) => onChangeRange(day, index, 'start', v)}
                    ariaLabel={`Hora de inicio ${dayLabel(day)}`}
                  />
                </div>

                <div className="schedule-section__field">
                  <span className="schedule-section__field-label text-body-3">
                    Hora de fin
                  </span>
                  <TimeField
                    value={range.end}
                    onChange={(v) => onChangeRange(day, index, 'end', v)}
                    ariaLabel={`Hora de fin ${dayLabel(day)}`}
                  />
                </div>

                {ranges.length > 1 && (
                  <button
                    type="button"
                    className="schedule-section__remove"
                    aria-label="Quitar este horario"
                    onClick={() => onRemoveRange(day, index)}
                  >
                    <IconPlus size={16} color="var(--color-grey-300)" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              className="schedule-section__add"
              onClick={() => onAddRange(day)}
            >
              <IconPlus size={16} color="var(--color-grey-300)" />
              <span className="text-body-3">Agregar otro horario</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
