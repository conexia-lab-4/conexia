import type { ReactNode } from 'react';
import { Button } from '../button';
import { IconTrash } from '../../assets/icons/IconTrash';
import './index.css';

interface DeleteScheduleDialogProps {
  title: string;
  message: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteScheduleDialog({
  title,
  message,
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
        <h2 className="delete-schedule-dialog__title">{title}</h2>
        <p className="delete-schedule-dialog__message">{message}</p>
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
