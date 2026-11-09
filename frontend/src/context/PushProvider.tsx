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

export function PushProvider({ children }: { children: ReactNode }) {
  const { user, status: authStatus } = useAuth();
  const uid = user?.uid ?? null;

  const [status, setStatus] = useState<PushStatus>('checking');
  const [isActive, setIsActive] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ownerUid, setOwnerUid] = useState(uid);
  const onCloseRef = useRef<(() => void) | undefined>(undefined);

  // Si cambia el usuario no se conserva nada de la sesión anterior
  if (ownerUid !== uid) {
    setOwnerUid(uid);
    setStatus('checking');
    setIsActive(false);
    setIsDialogOpen(false);
  }

  // Al iniciar sesión se revisa el permiso del dispositivo. Si ya estaba
  // concedido, se renueva el token en el backend sin mostrar nada
  useEffect(() => {
    if (authStatus !== 'authed') return;

    let ignore = false;

    async function check() {
      const state = await getPushState();
      if (ignore) return;
      setStatus(state);
      if (state !== 'granted') return;

      try {
        await syncPushToken();
        if (!ignore) setIsActive(true);
      } catch (error) {
        console.error('Error al registrar el token de notificaciones:', error);
      }
    }

    void check();

    return () => {
      ignore = true;
    };
  }, [authStatus, uid]);

  const enable = useCallback(async (): Promise<PushPermission> => {
    const result = await enablePush();
    setStatus(result);
    setIsActive(result === 'granted');
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
    () => ({ status, isActive, openEnableDialog }),
    [status, isActive, openEnableDialog],
  );

  return (
    <PushContext.Provider value={value}>
      {children}
      {isDialogOpen && (
        <EnablePushDialog
          status={status}
          onEnable={enable}
          onClose={closeDialog}
        />
      )}
    </PushContext.Provider>
  );
}
