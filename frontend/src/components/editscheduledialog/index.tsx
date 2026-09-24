import { useState, type FormEvent } from 'react';
import { Button } from '../button';
import { TextField } from '../textfield';
import { DaySelector, type DayValue } from '../dayselector';
import { TimeField } from '../timefield';
import { IconBook } from '../../assets/icons/IconBook';
import './index.css';

interface EditScheduleDialogProps {
  subjectName: string;
  initialDay: DayValue;
  initialStartTime: string;
  initialEndTime: string;
  initialClassroom: string;
  isSaving?: boolean;
  error?: string | null;
  onSave: (data: {
    dayOfWeek: DayValue;
    startTime: string;
    endTime: string;
    classroom: string;
  }) => void;
  onCancel: () => void;
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateTimes(startTime: string, endTime: string): string | null {
  if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
    return 'Completá la hora de inicio y de fin.';
  }
  if (endTime <= startTime) {
    return 'La hora de fin debe ser posterior a la hora de inicio.';
  }
  return null;
}

export function EditScheduleDialog({
  subjectName,
  initialDay,
  initialStartTime,
  initialEndTime,
  initialClassroom,
  isSaving,
  error,
  onSave,
  onCancel,
}: EditScheduleDialogProps) {
  const [day, setDay] = useState<DayValue>(initialDay);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [classroom, setClassroom] = useState(initialClassroom);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSaving) return;

    const validationMessage = validateTimes(startTime, endTime);
    if (validationMessage) {
      setLocalError(validationMessage);
      return;
    }

    setLocalError(null);
    onSave({ dayOfWeek: day, startTime, endTime, classroom });
  }

  const displayedError = localError ?? error;

  return (
    <div
      className="edit-schedule-dialog__overlay"
      onClick={isSaving ? undefined : onCancel}
    >
      <div
        className="edit-schedule-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="edit-schedule-dialog__title">Editar horario</h2>
        <p className="edit-schedule-dialog__subtitle">{subjectName}</p>

        <form className="edit-schedule-dialog__form" onSubmit={handleSubmit}>
          <div className="edit-schedule-dialog__field-group">
            <span className="edit-schedule-dialog__label">
              Día de la semana
            </span>
            <DaySelector selected={[day]} onToggle={setDay} />
          </div>

          <div className="edit-schedule-dialog__times">
            <div className="edit-schedule-dialog__field-group">
              <span className="edit-schedule-dialog__label">
                Hora de inicio
              </span>
              <TimeField
                value={startTime}
                onChange={(value) => {
                  setLocalError(null);
                  setStartTime(value);
                }}
                ariaLabel="Hora de inicio"
              />
            </div>
            <div className="edit-schedule-dialog__field-group">
              <span className="edit-schedule-dialog__label">Hora de fin</span>
              <TimeField
                value={endTime}
                onChange={(value) => {
                  setLocalError(null);
                  setEndTime(value);
                }}
                ariaLabel="Hora de fin"
              />
            </div>
          </div>

          <TextField
            label="Aula"
            variant="filled"
            leftIcon={<IconBook size={20} color="var(--color-grey-400)" />}
            value={classroom}
            onChange={(e) => setClassroom(e.target.value)}
            placeholder="Ej. 302"
          />

          {displayedError && (
            <p className="edit-schedule-dialog__error">{displayedError}</p>
          )}

          <div className="edit-schedule-dialog__actions">
            <Button
              variant="outlined"
              size="medium"
              type="button"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="fulfilled"
              size="medium"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
