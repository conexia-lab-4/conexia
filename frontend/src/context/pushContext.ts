import { createContext, useContext } from 'react';
import type { PushPermission } from '../lib/pushNotifications';

// 'checking' mientras se revisa el permiso del dispositivo
export type PushStatus = 'checking' | PushPermission;

export interface PushContextValue {
  status: PushStatus;
  // Permiso concedido y token registrado en el backend
  isActive: boolean;
  // Abre el pop-up para activar. onClose se llama al cerrarlo, sea cual sea el motivo
  openEnableDialog: (options?: { onClose?: () => void }) => void;
}

export const PushContext = createContext<PushContextValue | undefined>(
  undefined,
);

export function usePush(): PushContextValue {
  const ctx = useContext(PushContext);
  if (!ctx) {
    throw new Error('usePush debe usarse dentro de <PushProvider>');
  }
  return ctx;
}
