import { Button } from '../button';
import { IconTrash } from '../../assets/icons/IconTrash';
import './index.css';

interface DeleteScheduleDialogProps {
  subjectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteScheduleDialog({
  subjectName,
  onConfirm,
  onCancel,
}: DeleteScheduleDialogProps) {
  return (
    <div className="delete-schedule-dialog__overlay" onClick={onCancel}>
      <div
        className="delete-schedule-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="delete-schedule-dialog__icon">
          <IconTrash size={28} color="var(--color-error-500)" />
        </div>
        <h2 className="delete-schedule-dialog__title">¿Eliminar materia?</h2>
        <p className="delete-schedule-dialog__message">
          <strong>{subjectName}</strong> se eliminará de tus horarios. Esta
          acción no se puede deshacer.
        </p>
        <div className="delete-schedule-dialog__actions">
          <Button variant="outlined" size="medium" onClick={onCancel}>
            Cancelar
          </Button>
          <button
            type="button"
            className="delete-schedule-dialog__delete-btn"
            onClick={onConfirm}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
