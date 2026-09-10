import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import {
  getSubjects,
  deleteSchedule,
  type Subject,
} from '../../lib/subjectsApi';
import {
  groupSubjectsByDay,
  DAY_LABELS,
  type DayGroup,
  type ScheduleEntry,
} from '../../lib/scheduleGrouping';
import {
  ScheduleCard,
  type ScheduleCardColorVariant,
} from '../../components/schedulecards';
import { DeleteScheduleDialog } from '../../components/deletescheduledialog';
import { NavBar } from '../../components/navbar';
import { IconCalendar } from '../../assets/icons/IconCalendar';
import { IconUsersThreeOutline } from '../../assets/icons/IconUsersThreeOutline';
import './index.css';

type LoadStatus = 'loading' | 'ready' | 'error';

const COLOR_CYCLE: ScheduleCardColorVariant[] = [
  'blue',
  'green',
  'yellow',
  'red',
];

function buildSubjectColorMap(
  subjects: Subject[],
): Map<string, ScheduleCardColorVariant> {
  const map = new Map<string, ScheduleCardColorVariant>();
  subjects.forEach((subject, index) => {
    map.set(subject.id, COLOR_CYCLE[index % COLOR_CYCLE.length]);
  });
  return map;
}

export function Schedule() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [openMenuScheduleId, setOpenMenuScheduleId] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<ScheduleEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const data = await getSubjects();
        setSubjects(data);
        setStatus('ready');
      } catch (error) {
        console.error('Error al cargar materias y horarios:', error);
        setStatus('error');
      }
    });

    return () => unsubscribe();
  }, []);

  const dayGroups: DayGroup[] = groupSubjectsByDay(subjects);
  const totalEntries = dayGroups.reduce(
    (sum, group) => sum + group.entries.length,
    0,
  );
  const colorMap = buildSubjectColorMap(subjects);

  function handleToggleMenu(scheduleId: string) {
    setOpenMenuScheduleId((current) =>
      current === scheduleId ? null : scheduleId,
    );
  }

  function handleDeleteClick(entry: ScheduleEntry) {
    setOpenMenuScheduleId(null);
    setDeleteError(null);
    setDeleteTarget(entry);
  }

  function handleCancelDelete() {
    setDeleteTarget(null);
    setDeleteError(null);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteSchedule(deleteTarget.scheduleId);

      setSubjects((prev) =>
        prev.map((subject) =>
          subject.id === deleteTarget.subjectId
            ? {
                ...subject,
                schedules: subject.schedules.filter(
                  (s) => s.id !== deleteTarget.scheduleId,
                ),
              }
            : subject,
        ),
      );
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error al eliminar el horario:', error);
      setDeleteError('No pudimos eliminar la materia. Intentá de nuevo.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="schedule-page">
      <header className="schedule-page__header">
        <div>
          <h1 className="schedule-page__title">Mis Horarios</h1>
          <p className="schedule-page__subtitle">
            Organizá tus materias y encontrá estudiantes con horarios similares
          </p>
        </div>
        {/* Navega al alta de materia cuando ese ticket (KAN-109) esté implementado */}
        <button type="button" className="schedule-page__add-btn">
          + Agregar Materia
        </button>
      </header>

      {status === 'loading' && (
        <p className="schedule-page__status-message">Cargando...</p>
      )}

      {status === 'error' && (
        <p className="schedule-page__status-message schedule-page__status-message--error">
          No pudimos cargar tus horarios. Intentá de nuevo más tarde.
        </p>
      )}

      {status === 'ready' && (
        <>
          <div className="schedule-page__summary">
            <IconCalendar size={24} color="var(--color-primary-700)" />
            <div>
              <span className="schedule-page__summary-title">Esta semana</span>
              <span className="schedule-page__summary-count">
                {totalEntries} materia{totalEntries === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {dayGroups.length === 0 ? (
            <div className="schedule-page__empty">
              <p className="schedule-page__empty-title">
                Todavía no cargaste materias
              </p>
              <p className="schedule-page__empty-subtitle">
                Agregá tu primera materia para armar tu agenda semanal.
              </p>
            </div>
          ) : (
            dayGroups.map((group) => (
              <section key={group.day} className="schedule-page__day">
                <div className="schedule-page__day-header">
                  <span>{DAY_LABELS[group.day]}</span>
                  <span>
                    {group.entries.length} materia
                    {group.entries.length === 1 ? '' : 's'}
                  </span>
                </div>
                {group.entries.map((entry) => (
                  <ScheduleCard
                    key={entry.scheduleId}
                    subject={entry.subjectName}
                    colorVariant={colorMap.get(entry.subjectId) ?? 'blue'}
                    startTime={entry.startTime}
                    endTime={entry.endTime}
                    isMenuOpen={openMenuScheduleId === entry.scheduleId}
                    onToggleMenu={() => handleToggleMenu(entry.scheduleId)}
                    onDeleteClick={() => handleDeleteClick(entry)}
                  />
                ))}
              </section>
            ))
          )}

          <div className="schedule-page__match-prompt">
            <IconUsersThreeOutline size={24} color="var(--color-primary-700)" />
            <div>
              <p className="schedule-page__match-prompt-title">
                ¿Coincidís con otros estudiantes?
              </p>
              <p className="schedule-page__match-prompt-subtitle">
                Completá tus horarios para ver más matches.
              </p>
            </div>
          </div>
        </>
      )}

      {deleteTarget && (
        <DeleteScheduleDialog
          subjectName={deleteTarget.subjectName}
          isDeleting={isDeleting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}

      <NavBar activeItem="horarios" />
    </div>
  );
}
