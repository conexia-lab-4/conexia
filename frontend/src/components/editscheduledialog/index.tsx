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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave({ dayOfWeek: day, startTime, endTime, classroom });
  }

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
                onChange={setStartTime}
                ariaLabel="Hora de inicio"
              />
            </div>
            <div className="edit-schedule-dialog__field-group">
              <span className="edit-schedule-dialog__label">Hora de fin</span>
              <TimeField
                value={endTime}
                onChange={setEndTime}
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

          {error && <p className="edit-schedule-dialog__error">{error}</p>}

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
