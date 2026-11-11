import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconBell } from '../../assets/icons/IconBell';
import { IconClose } from '../../assets/icons/IconClose';
import type { PushStatus } from '../../context/pushContext';
import type { PushPermission } from '../../lib/pushNotifications';
import { Button } from '../button';
import './index.css';

// Controles del diálogo que pueden recibir el foco
const FOCUSABLE =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

interface EnablePushDialogProps {
  status: PushStatus;
  // El permiso ya está concedido, pero falló registrar este dispositivo
  needsRecovery: boolean;
  onEnable: () => Promise<PushPermission>;
  onClose: () => void;
}

export function EnablePushDialog({
  status,
  needsRecovery,
  onEnable,
  onClose,
}: EnablePushDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isEnabling, setIsEnabling] = useState(false);
  const [result, setResult] = useState<PushPermission | null>(null);
  const [error, setError] = useState<string | null>(null);
  // El modo se fija al abrir: no cambia aunque la recuperación se resuelva sola
  const [isRecovery] = useState(needsRecovery);

  const current = result ?? status;
  const isBlocked = current === 'denied';
  const isUnsupported = current === 'unsupported';
  const canEnable = !isBlocked && !isUnsupported;

  // Mientras está abierto, el resto de la página queda inactivo (no recibe
  // foco ni clics). Al cerrar, el foco vuelve al control que lo abrió
  useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');

    return () => {
      root?.removeAttribute('inert');
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  // El foco siempre tiene que estar dentro del diálogo: al abrirlo, y cuando
  // el control que lo tenía desaparece o se deshabilita
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) {
      (dialog.querySelector<HTMLElement>(FOCUSABLE) ?? dialog).focus();
    }
  }, [isEnabling, current, error]);

  // Escape cierra; Tab y Shift+Tab circulan solo entre los controles del diálogo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!isEnabling) onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEnabling, onClose]);

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
  let actionLabel = 'Activar notificaciones';

  if (isBlocked) {
    title = 'Notificaciones bloqueadas';
    message =
      'Bloqueaste las notificaciones de este sitio en el navegador. Para recibirlas con la app cerrada, habilitalas desde la configuración del sitio. Mientras tanto, los avisos te siguen llegando dentro de la app.';
  } else if (isUnsupported) {
    title = 'Notificaciones no disponibles';
    message =
      'Este dispositivo o navegador no permite recibir notificaciones con la app cerrada. Los avisos te siguen llegando dentro de la app.';
  } else if (isRecovery) {
    title = 'No pudimos terminar la activación';
    message =
      'Tenés el permiso concedido, pero no pudimos registrar este dispositivo para recibir avisos con la app cerrada. Probá de nuevo. Los avisos de adentro de la app no se ven afectados.';
    actionLabel = 'Reintentar';
  }

  return createPortal(
    <div
      className="enable-push-dialog__overlay"
      onClick={isEnabling ? undefined : onClose}
    >
      <div
        ref={dialogRef}
        className="enable-push-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="enable-push-dialog-title"
        tabIndex={-1}
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
        {error && (
          <p className="enable-push-dialog__error" role="alert">
            {error}
          </p>
        )}

        <div className="enable-push-dialog__actions">
          {canEnable ? (
            <Button
              type="button"
              variant="fulfilled"
              size="large-wide"
              onClick={handleEnable}
              disabled={isEnabling}
            >
              {isEnabling ? 'Activando...' : actionLabel}
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
    </div>,
    document.body,
  );
}
