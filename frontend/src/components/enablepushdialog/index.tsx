import { useState } from 'react';
import { IconBell } from '../../assets/icons/IconBell';
import { IconClose } from '../../assets/icons/IconClose';
import type { PushStatus } from '../../context/pushContext';
import type { PushPermission } from '../../lib/pushNotifications';
import { Button } from '../button';
import './index.css';

interface EnablePushDialogProps {
  status: PushStatus;
  onEnable: () => Promise<PushPermission>;
  onClose: () => void;
}

export function EnablePushDialog({
  status,
  onEnable,
  onClose,
}: EnablePushDialogProps) {
  const [isEnabling, setIsEnabling] = useState(false);
  const [result, setResult] = useState<PushPermission | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = result ?? status;
  const isBlocked = current === 'denied';
  const isUnsupported = current === 'unsupported';
  const canEnable = !isBlocked && !isUnsupported;

  const handleEnable = async () => {
    setIsEnabling(true);
    setError(null);
    try {
      const permission = await onEnable();
      if (permission === 'granted') {
        onClose();
        return;
      }
      setResult(permission);
    } catch (enableError) {
      console.error('Error al activar las notificaciones:', enableError);
      setError('No pudimos activar las notificaciones. Intentá de nuevo.');
    } finally {
      setIsEnabling(false);
    }
  };

  let title = 'Activá las notificaciones';
  let message =
    'Enterate al instante cuando alguien se sume a tu viaje, tengas un nuevo match o te escriban, aunque no tengas la app abierta.';

  if (isBlocked) {
    title = 'Notificaciones bloqueadas';
    message =
      'Bloqueaste las notificaciones de este sitio en el navegador. Para recibirlas con la app cerrada, habilitalas desde la configuración del sitio. Mientras tanto, los avisos te siguen llegando dentro de la app.';
  } else if (isUnsupported) {
    title = 'Notificaciones no disponibles';
    message =
      'Este dispositivo o navegador no permite recibir notificaciones con la app cerrada. Los avisos te siguen llegando dentro de la app.';
  }

  return (
    <div
      className="enable-push-dialog__overlay"
      onClick={isEnabling ? undefined : onClose}
    >
      <div
        className="enable-push-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="enable-push-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="enable-push-dialog__close"
          onClick={onClose}
          disabled={isEnabling}
          aria-label="Cerrar"
        >
          <IconClose size={12} color="var(--color-grey-400)" />
        </button>

        <div className="enable-push-dialog__icon">
          <IconBell size={28} color="var(--color-primary-500)" />
        </div>
        <h2 id="enable-push-dialog-title" className="enable-push-dialog__title">
          {title}
        </h2>
        <p className="enable-push-dialog__message">{message}</p>
        {error && <p className="enable-push-dialog__error">{error}</p>}

        <div className="enable-push-dialog__actions">
          {canEnable ? (
            <Button
              type="button"
              variant="fulfilled"
              size="large-wide"
              onClick={handleEnable}
              disabled={isEnabling}
            >
              {isEnabling ? 'Activando...' : 'Activar notificaciones'}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outlined"
              size="large-wide"
              onClick={onClose}
            >
              Entendido
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
