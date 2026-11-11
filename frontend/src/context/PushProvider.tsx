import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { EnablePushDialog } from '../components/enablepushdialog';
import {
  enablePush,
  getPushState,
  syncPushToken,
  type PushPermission,
} from '../lib/pushNotifications';
import { useAuth } from './authContext';
import {
  PushContext,
  type PushContextValue,
  type PushStatus,
} from './pushContext';

// Cada cuánto se reintenta el registro del dispositivo si falló
const RETRY_INTERVAL_MS = 60_000;

export function PushProvider({ children }: { children: ReactNode }) {
  const { user, status: authStatus } = useAuth();
  const uid = user?.uid ?? null;

  const [status, setStatus] = useState<PushStatus>('checking');
  const [isActive, setIsActive] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ownerUid, setOwnerUid] = useState(uid);
  const onCloseRef = useRef<(() => void) | undefined>(undefined);
  const isSyncingRef = useRef(false);
  const uidRef = useRef(uid);

  // Si cambia el usuario no se conserva nada de la sesión anterior
  if (ownerUid !== uid) {
    setOwnerUid(uid);
    setStatus('checking');
    setIsActive(false);
    setSyncFailed(false);
    setIsDialogOpen(false);
  }

  useEffect(() => {
    uidRef.current = uid;
  }, [uid]);

  // Registra el token de este dispositivo en el backend. Si falla, queda
  // marcado para reintentar
  const syncToken = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    const startedFor = uidRef.current;

    try {
      await syncPushToken();
      if (uidRef.current !== startedFor) return;
      setIsActive(true);
      setSyncFailed(false);
    } catch (error) {
      console.error('Error al registrar el token de notificaciones:', error);
      if (uidRef.current !== startedFor) return;
      setSyncFailed(true);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Al iniciar sesión se revisa el permiso del dispositivo. Si ya estaba
  // concedido, se renueva el token en el backend sin mostrar nada
  useEffect(() => {
    if (authStatus !== 'authed') return;

    let ignore = false;

    async function check() {
      const state = await getPushState();
      if (ignore) return;
      setStatus(state);
      if (state === 'granted') await syncToken();
    }

    void check();

    return () => {
      ignore = true;
    };
  }, [authStatus, uid, syncToken]);

  // Permiso concedido pero sin dispositivo registrado
  const needsRecovery = status === 'granted' && !isActive && syncFailed;

  // Ante un error transitorio, la app se recupera sola: reintenta cada tanto,
  // al volver la conexión y al volver a la pestaña
  const shouldRetry = authStatus === 'authed' && needsRecovery;
  useEffect(() => {
    if (!shouldRetry) return;

    const retry = () => void syncToken();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') retry();
    };

    const timer = setInterval(retry, RETRY_INTERVAL_MS);
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shouldRetry, syncToken]);

  const enable = useCallback(async (): Promise<PushPermission> => {
    const result = await enablePush();
    setStatus(result);
    setIsActive(result === 'granted');
    setSyncFailed(false);
    return result;
  }, []);

  const openEnableDialog = useCallback((options?: { onClose?: () => void }) => {
    onCloseRef.current = options?.onClose;
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    const onClose = onCloseRef.current;
    onCloseRef.current = undefined;
    setIsDialogOpen(false);
    onClose?.();
  }, []);

  const value = useMemo<PushContextValue>(
    () => ({ status, isActive, needsRecovery, openEnableDialog }),
    [status, isActive, needsRecovery, openEnableDialog],
  );

  return (
    <PushContext.Provider value={value}>
      {children}
      {isDialogOpen && (
        <EnablePushDialog
          status={status}
          needsRecovery={needsRecovery}
          onEnable={enable}
          onClose={closeDialog}
        />
      )}
    </PushContext.Provider>
  );
}
