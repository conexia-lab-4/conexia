import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBack } from '../../assets/icons/IconBack';
import { IconCamera } from '../../assets/icons/IconCamera';
import { IconClose } from '../../assets/icons/IconClose';
import { IconSparkles } from '../../assets/icons/IconSparkles';
import { Button } from '../../components/button';
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

export function ImportSubjects() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState('');

  // Libera la vista previa anterior al cambiar de foto o al salir de la pantalla
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

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
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemove = () => {
    setImage(null);
    setPreviewUrl(null);
    setFileError('');
  };

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

        {previewUrl ? (
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
      </main>

      <div className="import-subjects__footer">
        <Button
          type="button"
          variant="fulfilled"
          size="large-wide"
          disabled={!image}
          rightIcon={<IconSparkles size={20} color="var(--color-white)" />}
        >
          Procesar horarios
        </Button>
      </div>
    </div>
  );
}
