import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import {
  getSubjects,
  deleteSchedule,
  deleteSubject,
  updateSchedule,
  type Subject,
  type SubjectColor,
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
import { EditScheduleDialog } from '../../components/editscheduledialog';
import type { DayValue } from '../../components/dayselector';
import { NavBar } from '../../components/navbar';
import { IconCalendar } from '../../assets/icons/IconCalendar';
import { IconUsersThreeOutline } from '../../assets/icons/IconUsersThreeOutline';
import './index.css';

type LoadStatus = 'loading' | 'ready' | 'error';

function buildSubjectColorMap(
  subjects: Subject[],
): Map<string, ScheduleCardColorVariant> {
  const map = new Map<string, ScheduleCardColorVariant>();
  subjects.forEach((subject) => {
    map.set(subject.id, (subject.color as SubjectColor) ?? 'BLUE');
  });
  return map;
}

export function Schedule() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [openMenuScheduleId, setOpenMenuScheduleId] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<ScheduleEntry | null>(null);
  const [deleteMode, setDeleteMode] = useState<'schedule' | 'subject'>(
    'schedule',
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<ScheduleEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadSubjects = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await getSubjects();
      setSubjects(data);
      setStatus('ready');
    } catch (error) {
      console.error('Error al cargar materias y horarios:', error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      loadSubjects();
    });

    return () => unsubscribe();
  }, [loadSubjects]);

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

  function getScheduleDeleteMessage(entry: ScheduleEntry): string {
    // "Materia" se identifica por nombre: puede haber varias altas
    // (registros) con el mismo nombre, cada una con sus propios horarios.
    // Por eso el total hay que contarlo across todas, no solo la de este id.
    const totalSchedulesWithSameName = subjects
      .filter((s) => s.name === entry.subjectName)
      .reduce((sum, s) => sum + s.schedules.length, 0);
    const isLastSchedule = totalSchedulesWithSameName <= 1;
    const dayLabel = DAY_LABELS[entry.dayOfWeek].toLowerCase();
    const timeRange = `${entry.startTime} -${entry.endTime}`;

    return isLastSchedule
      ? `Se eliminará la clase de ${entry.subjectName} del ${dayLabel} (${timeRange}). Como era tu único horario, la materia también se eliminará`
      : `Se eliminará la clase de ${entry.subjectName} del ${dayLabel} (${timeRange}). La materia seguirá apareciendo en tus horarios`;
  }

  function handleDeleteScheduleClick(entry: ScheduleEntry) {
    setOpenMenuScheduleId(null);
    setDeleteError(null);
    setDeleteMode('schedule');
    setDeleteTarget(entry);
  }

  function handleDeleteSubjectClick(entry: ScheduleEntry) {
    setOpenMenuScheduleId(null);
    setDeleteError(null);
    setDeleteMode('subject');
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
      if (deleteMode === 'subject') {
        await deleteSubject(deleteTarget.subjectId);
        // El backend borra todas las materias del usuario con este nombre
        // (dos altas separadas con el mismo nombre cuentan como la misma
        // materia), así que el estado local filtra por nombre, no por id.
        setSubjects((prev) =>
          prev.filter((subject) => subject.name !== deleteTarget.subjectName),
        );
      } else {
        await deleteSchedule(deleteTarget.scheduleId);
        // El backend borra también la materia si ese era su último horario,
        // así que la sacamos del estado local en vez de dejarla vacía.
        setSubjects((prev) =>
          prev
            .map((subject) =>
              subject.id === deleteTarget.subjectId
                ? {
                    ...subject,
                    schedules: subject.schedules.filter(
                      (s) => s.id !== deleteTarget.scheduleId,
                    ),
                  }
                : subject,
            )
            .filter((subject) => subject.schedules.length > 0),
        );
      }
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error al eliminar:', error);
      setDeleteError(
        deleteMode === 'subject'
          ? 'No pudimos eliminar la materia. Intentá de nuevo.'
          : 'No pudimos eliminar el horario. Intentá de nuevo.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function handleEditClick(entry: ScheduleEntry) {
    setOpenMenuScheduleId(null);
    setSaveError(null);
    setEditTarget(entry);
  }

  async function handleSaveEdit(data: {
    dayOfWeek: DayValue;
    startTime: string;
    endTime: string;
    classroom: string;
  }) {
    if (!editTarget) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const updated = await updateSchedule(editTarget.scheduleId, {
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        classroom: data.classroom,
      });

      setSubjects((prev) =>
        prev.map((subject) =>
          subject.id === editTarget.subjectId
            ? {
                ...subject,
                schedules: subject.schedules.map((s) =>
                  s.id === editTarget.scheduleId ? updated : s,
                ),
              }
            : subject,
        ),
      );
      setEditTarget(null);
    } catch (error) {
      console.error('Error al actualizar el horario:', error);
      setSaveError('No pudimos guardar los cambios. Intentá de nuevo.');
    } finally {
      setIsSaving(false);
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
        <button
          type="button"
          className="schedule-page__add-btn"
          onClick={() => navigate('/assignments/new')}
        >
          + Agregar Materia
        </button>
      </header>

      {status === 'loading' && (
        <p className="schedule-page__status-message">Cargando...</p>
      )}

      {status === 'error' && (
        <div className="schedule-page__status-message schedule-page__status-message--error">
          <p>No pudimos cargar tus horarios. Intentá de nuevo más tarde.</p>
          <button
            type="button"
            className="schedule-page__retry-button"
            onClick={loadSubjects}
          >
            Reintentar
          </button>
        </div>
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
                    colorVariant={colorMap.get(entry.subjectId) ?? 'BLUE'}
                    startTime={entry.startTime}
                    endTime={entry.endTime}
                    classroom={entry.classroom ?? undefined}
                    isMenuOpen={openMenuScheduleId === entry.scheduleId}
                    onToggleMenu={() => handleToggleMenu(entry.scheduleId)}
                    onEdit={() => handleEditClick(entry)}
                    onDeleteScheduleClick={() =>
                      handleDeleteScheduleClick(entry)
                    }
                    onDeleteSubjectClick={() => handleDeleteSubjectClick(entry)}
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
          title={
            deleteMode === 'subject'
              ? '¿Eliminar materia?'
              : '¿Eliminar solo este horario?'
          }
          message={
            deleteMode === 'subject'
              ? subjects.filter((s) => s.name === deleteTarget.subjectName)
                  .length > 1
                ? `Se eliminarán todas las materias llamadas "${deleteTarget.subjectName}" junto con todos sus horarios. Esta acción no se puede deshacer.`
                : `${deleteTarget.subjectName} se eliminará por completo, junto con todos sus horarios. Esta acción no se puede deshacer.`
              : getScheduleDeleteMessage(deleteTarget)
          }
          isDeleting={isDeleting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}

      {editTarget && (
        <EditScheduleDialog
          subjectName={editTarget.subjectName}
          initialDay={editTarget.dayOfWeek as DayValue}
          initialStartTime={editTarget.startTime}
          initialEndTime={editTarget.endTime}
          initialClassroom={editTarget.classroom ?? ''}
          isSaving={isSaving}
          error={saveError}
          onSave={handleSaveEdit}
          onCancel={() => setEditTarget(null)}
        />
      )}

      <NavBar activeItem="horarios" />
    </div>
  );
}
