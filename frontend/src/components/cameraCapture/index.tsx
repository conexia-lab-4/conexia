import { useEffect, useRef, useState } from 'react';
import { Button } from '../button';
import './index.css';

interface CameraCaptureProps {
  onCapture: (photo: File) => void;
  onCancel: () => void;
}

type CameraStatus = 'starting' | 'ready' | 'error';

// Muestra la webcam en vivo y saca una foto. Se usa donde el input con
// `capture` no abre la cámara (en la compu el navegador lo ignora)
export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('starting');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        // Si el modal se cerró mientras se pedía el permiso, se apaga enseguida
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus('ready');
      })
      .catch((error) => {
        console.error('No se pudo abrir la cámara:', error);
        if (!cancelled) setStatus('error');
      });

    // La cámara se apaga siempre al cerrar el modal
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [attempt]);

  const handleRetry = () => {
    setStatus('starting');
    setAttempt((value) => value + 1);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Igual que la vista previa, que se muestra espejada como un selfie
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], 'camara.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9,
    );
  };

  return (
    <div className="camera-capture__overlay" onClick={onCancel}>
      <div
        className="camera-capture"
        role="dialog"
        aria-modal="true"
        aria-label="Tomar foto"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="camera-capture__title">Tomar foto</h2>

        <div className="camera-capture__frame">
          <video
            ref={videoRef}
            className="camera-capture__video"
            autoPlay
            playsInline
            muted
          />
          {status === 'starting' && (
            <p className="camera-capture__status">Abriendo la cámara...</p>
          )}
          {status === 'error' && (
            <p className="camera-capture__status">
              No pudimos acceder a la cámara. Revisá que el navegador tenga
              permiso para usarla.
            </p>
          )}
        </div>

        <div className="camera-capture__actions">
          <Button
            type="button"
            variant="outlined"
            size="medium"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          {status === 'error' ? (
            <Button
              type="button"
              variant="fulfilled"
              size="medium"
              onClick={handleRetry}
            >
              Reintentar
            </Button>
          ) : (
            <Button
              type="button"
              variant="fulfilled"
              size="medium"
              disabled={status !== 'ready'}
              onClick={handleCapture}
            >
              Sacar foto
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
