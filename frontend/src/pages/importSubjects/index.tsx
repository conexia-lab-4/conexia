import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBack } from '../../assets/icons/IconBack';
import { IconCamera } from '../../assets/icons/IconCamera';
import { IconClose } from '../../assets/icons/IconClose';
import { IconSparkles } from '../../assets/icons/IconSparkles';
import { Button } from '../../components/button';
import ConexiaLoader from '../../components/ConexiaLoader';
import { DeleteScheduleDialog } from '../../components/deletescheduledialog';
import {
  createSubject,
  extractSubjects,
  type DayOfWeek,
} from '../../lib/subjectsApi';
import { getProfile, type ProfileResponse } from '../../lib/profileApi';
import { EditScheduleDialog } from '../../components/editscheduledialog';
import type { DayValue } from '../../components/dayselector';
import { DAY_OPTIONS } from '../../components/dayselector/constants';
import {
  buildDraftBlocks,
  isBlockComplete,
  toSubjectInputs,
  type DraftBlock,
} from '../../lib/subjectDraft';
import { DAY_LABELS } from '../../lib/scheduleGrouping';
import { ScheduleCard } from '../../components/schedulecards';
import './index.css';

// Mismos formatos y tamaño máximo que acepta el backend (POST /subjects/extract)
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type ExtractStatus = 'idle' | 'processing' | 'empty' | 'error';

// El selector de días solo llega hasta el viernes: un sábado o domingo
// detectado se muestra, pero hay que elegir de nuevo el día al editarlo
function toDayValue(day: DayOfWeek | ''): DayValue | '' {
  return DAY_OPTIONS.some((option) => option.value === day)
    ? (day as DayValue)
    : '';
}

interface DeleteTarget {
  block: DraftBlock;
  mode: 'schedule' | 'subject';
}

function getDeleteMessage(target: DeleteTarget, blocks: DraftBlock[]): string {
  const { block, mode } = target;
  const name = block.name || 'esta materia';

  if (mode === 'subject') {
    return `${name} se eliminará del borrador, junto con todos sus horarios.`;
  }

  const isLastSchedule =
    blocks.filter((item) => item.subjectKey === block.subjectKey).length <= 1;
  const detail =
    block.dayOfWeek && block.startTime && block.endTime
      ? ` del ${DAY_LABELS[block.dayOfWeek].toLowerCase()} (${block.startTime} - ${block.endTime})`
      : '';

  return isLastSchedule
    ? `Se eliminará la clase de ${name}${detail}. Como era el único horario, la materia también se eliminará del borrador`
    : `Se eliminará la clase de ${name}${detail}. La materia seguirá en el borrador`;
}

export function ImportSubjects() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState('');
  const [status, setStatus] = useState<ExtractStatus>('idle');
  const [extractError, setExtractError] = useState('');
  const [blocks, setBlocks] = useState<DraftBlock[] | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<DraftBlock | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [profile, setProfile] = useState<ProfileResponse | null>(null);

  // Libera la vista previa anterior al cambiar de foto o al salir de la pantalla
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Carrera y sede del perfil: solo se muestran como referencia
  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch((error) => console.error('Error al cargar el perfil:', error));
  }, []);

  const openPicker = () => inputRef.current?.click();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Permite volver a elegir el mismo archivo después de quitarlo
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Elegí una imagen JPG, PNG, WEBP o HEIC');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFileError('La imagen supera los 10 MB');
      return;
    }

    setFileError('');
    setStatus('idle');
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemove = () => {
    setImage(null);
    setPreviewUrl(null);
    setFileError('');
    setStatus('idle');
  };

  const handleProcess = async () => {
    if (!image || status === 'processing') return;

    setStatus('processing');
    setExtractError('');

    try {
      const subjects = await extractSubjects(image);
      if (subjects.length === 0) {
        setStatus('empty');
        return;
      }
      setBlocks(buildDraftBlocks(subjects));
      setStatus('idle');
    } catch (error) {
      setExtractError(
        error instanceof Error
          ? error.message
          : 'No pudimos procesar la imagen. Intentá de nuevo',
      );
      setStatus('error');
    }
  };

  const handleEditClick = (block: DraftBlock) => {
    setOpenMenuId(null);
    setEditTarget(block);
  };

  const handleSaveEdit = (data: {
    name: string;
    dayOfWeek: DayValue;
    startTime: string;
    endTime: string;
    classroom: string;
  }) => {
    if (!editTarget) return;

    // El nombre es de la materia: se actualiza en todos sus bloques. Día,
    // horas y aula son solo del bloque editado
    setBlocks(
      (current) =>
        current?.map((block) => {
          if (block.subjectKey !== editTarget.subjectKey) return block;
          const renamed = { ...block, name: data.name.trim() };
          if (block.id !== editTarget.id) return renamed;
          return {
            ...renamed,
            dayOfWeek: data.dayOfWeek,
            startTime: data.startTime,
            endTime: data.endTime,
            classroom: data.classroom.trim(),
          };
        }) ?? null,
    );
    setEditTarget(null);
  };

  const handleDeleteClick = (block: DraftBlock, mode: DeleteTarget['mode']) => {
    setOpenMenuId(null);
    setDeleteTarget({ block, mode });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const { block, mode } = deleteTarget;

    setBlocks((current) => {
      const remaining = (current ?? []).filter((item) =>
        mode === 'subject'
          ? item.subjectKey !== block.subjectKey
          : item.id !== block.id,
      );
      // Sin nada que revisar se vuelve a la selección de la foto
      return remaining.length > 0 ? remaining : null;
    });
    setDeleteTarget(null);
  };

  const handleSave = async () => {
    if (!blocks || isSaving) return;

    setIsSaving(true);
    setSaveError('');

    // Una alta por materia. Las que se guardan salen del borrador, así un
    // reintento solo envía las pendientes y no duplica las ya guardadas
    const savedKeys = new Set<number>();
    for (const { subjectKey, input } of toSubjectInputs(blocks)) {
      try {
        await createSubject(input);
        savedKeys.add(subjectKey);
      } catch (error) {
        console.error('Error al guardar la materia:', error);
      }
    }

    const totalSubjects = new Set(blocks.map((block) => block.subjectKey)).size;
    if (savedKeys.size === totalSubjects) {
      navigate('/schedule');
      return;
    }

    setBlocks(
      (current) =>
        current?.filter((block) => !savedKeys.has(block.subjectKey)) ?? null,
    );
    setSaveError(
      savedKeys.size > 0
        ? `Guardamos ${savedKeys.size} materia${savedKeys.size === 1 ? '' : 's'}, pero no pudimos guardar el resto. Intentá de nuevo.`
        : 'No pudimos guardar las materias. Intentá de nuevo.',
    );
    setIsSaving(false);
  };

  const profileInfo = [
    profile?.career && `Carrera: ${profile.career}`,
    profile?.campus && `Sede: ${profile.campus}`,
  ]
    .filter(Boolean)
    .join(' · ');

  if (blocks) {
    const subjectCount = new Set(blocks.map((block) => block.subjectKey)).size;
    const hasIncomplete = blocks.some((block) => !isBlockComplete(block));

    return (
      <div className="import-subjects">
        <header className="import-subjects__header">
          <button
            type="button"
            className="import-subjects__back"
            onClick={() => setBlocks(null)}
            aria-label="Volver"
          >
            <IconBack size={24} color="var(--color-black)" />
          </button>
          <h1 className="import-subjects__header-title text-h6">
            Materias detectadas
          </h1>
        </header>

        <main className="import-subjects__content">
          <div className="import-subjects__heading">
            <h2 className="import-subjects__title text-h6">
              Revisá las materias detectadas
            </h2>
            <p className="import-subjects__subtitle text-body-3">
              Podés editar la información antes de guardar.
            </p>
            {profileInfo && (
              <p className="import-subjects__subtitle text-body-3">
                {profileInfo}
              </p>
            )}
          </div>

          <div className="import-subjects__list">
            {blocks.map((block) => (
              <ScheduleCard
                key={block.id}
                subject={block.name || 'Sin nombre'}
                colorVariant={block.color}
                startTime={block.startTime || '--:--'}
                endTime={block.endTime || '--:--'}
                classroom={block.classroom || undefined}
                dayLabel={
                  block.dayOfWeek
                    ? DAY_LABELS[block.dayOfWeek].charAt(0) +
                      DAY_LABELS[block.dayOfWeek].slice(1).toLowerCase()
                    : 'Sin día'
                }
                isMenuOpen={openMenuId === block.id}
                onToggleMenu={() =>
                  setOpenMenuId((current) =>
                    current === block.id ? null : block.id,
                  )
                }
                onEdit={() => handleEditClick(block)}
                onDeleteScheduleClick={() =>
                  handleDeleteClick(block, 'schedule')
                }
                onDeleteSubjectClick={() => handleDeleteClick(block, 'subject')}
              />
            ))}
          </div>
          {saveError && (
            <p className="import-subjects__error text-body-3" role="alert">
              {saveError}
            </p>
          )}
        </main>

        <div className="import-subjects__footer">
          <Button
            type="button"
            variant="fulfilled"
            size="large-wide"
            disabled={hasIncomplete || isSaving}
            onClick={handleSave}
          >
            {isSaving
              ? 'Guardando...'
              : `Guardar ${subjectCount} materia${subjectCount === 1 ? '' : 's'}`}
          </Button>
        </div>

        {editTarget && (
          <EditScheduleDialog
            subjectName={editTarget.name}
            initialName={editTarget.name}
            initialDay={toDayValue(editTarget.dayOfWeek)}
            initialStartTime={editTarget.startTime}
            initialEndTime={editTarget.endTime}
            initialClassroom={editTarget.classroom}
            onSave={handleSaveEdit}
            onCancel={() => setEditTarget(null)}
          />
        )}

        {deleteTarget && (
          <DeleteScheduleDialog
            title={
              deleteTarget.mode === 'subject'
                ? '¿Eliminar materia?'
                : '¿Eliminar solo este horario?'
            }
            message={getDeleteMessage(deleteTarget, blocks)}
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="import-subjects">
      <header className="import-subjects__header">
        <button
          type="button"
          className="import-subjects__back"
          onClick={() => navigate('/schedule')}
          aria-label="Volver"
        >
          <IconBack size={24} color="var(--color-black)" />
        </button>
        <h1 className="import-subjects__header-title text-h6">
          Cargar desde foto
        </h1>
      </header>

      <main className="import-subjects__content">
        <div className="import-subjects__heading">
          <h2 className="import-subjects__title text-h6">
            Subí una foto de tu horario
          </h2>
          <p className="import-subjects__subtitle text-body-3">
            Puede ser una captura del SIU o una foto de tu cronograma.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="import-subjects__input"
          onChange={handleFileChange}
        />

        {status === 'processing' ? (
          <div className="import-subjects__status loading-area">
            <ConexiaLoader />
            <p className="text-body-3">Estamos leyendo tu horario...</p>
          </div>
        ) : previewUrl ? (
          <div className="import-subjects__dropzone">
            <div className="import-subjects__preview">
              <img
                src={previewUrl}
                alt="Vista previa de tu horario"
                className="import-subjects__image"
              />
              <button
                type="button"
                className="import-subjects__remove"
                onClick={handleRemove}
                aria-label="Quitar foto"
              >
                <IconClose size={12} color="var(--color-white)" />
              </button>
            </div>
            <button
              type="button"
              className="import-subjects__change"
              onClick={openPicker}
            >
              <IconCamera size={20} color="var(--color-grey-400)" />
              <span className="text-body-3">Cambiar foto</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="import-subjects__dropzone import-subjects__dropzone--empty"
            onClick={openPicker}
          >
            <IconCamera size={40} color="var(--color-grey-300)" />
            <span className="text-body-3">Tocá para elegir una foto</span>
          </button>
        )}

        {fileError && (
          <p className="import-subjects__error text-body-3" role="alert">
            {fileError}
          </p>
        )}

        {status === 'error' && (
          <p className="import-subjects__error text-body-3" role="alert">
            {extractError}
          </p>
        )}

        {status === 'empty' && (
          <p className="import-subjects__empty text-body-3">
            No encontramos materias en esa imagen. Probá con otra foto.
          </p>
        )}
      </main>

      <div className="import-subjects__footer">
        <Button
          type="button"
          variant="fulfilled"
          size="large-wide"
          disabled={!image || status === 'processing'}
          onClick={handleProcess}
          rightIcon={<IconSparkles size={20} color="var(--color-white)" />}
        >
          {status === 'processing'
            ? 'Procesando...'
            : status === 'error'
              ? 'Reintentar'
              : 'Procesar horarios'}
        </Button>
      </div>
    </div>
  );
}
