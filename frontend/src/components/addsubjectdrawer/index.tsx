import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCamera } from '../../assets/icons/IconCamera';
import { IconChevronRight } from '../../assets/icons/IconChevronRight';
import { IconClose } from '../../assets/icons/IconClose';
import { IconWrite } from '../../assets/icons/IconWrite';
import './index.css';

interface AddSubjectDrawerProps {
  onClose: () => void;
}

export function AddSubjectDrawer({ onClose }: AddSubjectDrawerProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="add-subject-drawer__overlay" onClick={onClose}>
      <div
        className="add-subject-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-subject-drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="add-subject-drawer__close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <IconClose size={12} color="var(--color-grey-400)" />
        </button>
        <span className="add-subject-drawer__handle" />
        <h2 id="add-subject-drawer-title" className="add-subject-drawer__title">
          ¿Cómo querés cargar la materia?
        </h2>

        <button
          type="button"
          className="add-subject-drawer__option"
          onClick={() => navigate('/assignments/import')}
        >
          <IconCamera size={28} color="var(--color-primary-500)" />
          <span className="add-subject-drawer__texts">
            <span className="add-subject-drawer__option-title">
              Cargar desde foto
            </span>
            <span className="add-subject-drawer__option-description">
              Subí una foto de tu horario (ej. SIU o captura) y detectamos las
              materias automáticamente
            </span>
          </span>
          <IconChevronRight size={16} color="var(--color-primary-500)" />
        </button>

        <button
          type="button"
          className="add-subject-drawer__option"
          onClick={() => navigate('/assignments/new')}
        >
          <IconWrite size={28} color="var(--color-primary-500)" />
          <span className="add-subject-drawer__texts">
            <span className="add-subject-drawer__option-title">
              Cargar manualmente
            </span>
            <span className="add-subject-drawer__option-description">
              Completá los datos de la materia y su horario
            </span>
          </span>
          <IconChevronRight size={16} color="var(--color-primary-500)" />
        </button>
      </div>
    </div>
  );
}
