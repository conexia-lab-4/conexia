import { getApp } from 'firebase/app';
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
} from 'firebase/messaging';
import { registerPushToken } from './notificationsApi';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Nombre y alcance que usa Firebase por defecto para recibir push
const SERVICE_WORKER_URL = '/firebase-messaging-sw.js';
const SERVICE_WORKER_SCOPE = '/firebase-cloud-messaging-push-scope';

export type PushPermission = 'unsupported' | 'default' | 'granted' | 'denied';

// Estado del permiso en este dispositivo. 'unsupported' si el navegador no
// puede recibir push (por ejemplo, un iPhone sin la app instalada)
export async function getPushState(): Promise<PushPermission> {
  if (!(await isSupported())) return 'unsupported';
  return Notification.permission;
}

// Con el permiso ya concedido, obtiene el token FCM de este dispositivo
async function fetchToken(): Promise<string> {
  const registration = await navigator.serviceWorker.register(
    SERVICE_WORKER_URL,
    { scope: SERVICE_WORKER_SCOPE },
  );

  const token = await getToken(getMessaging(getApp()), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error('No pudimos obtener el token de notificaciones');
  }
  return token;
}

// Renueva el token en el backend. Es idempotente: se puede repetir
export async function syncPushToken(): Promise<void> {
  await registerPushToken(await fetchToken());
}

// Pide el permiso al navegador y, si se concede, registra el token en el
// backend. Devuelve el estado final del permiso
export async function enablePush(): Promise<PushPermission> {
  const state = await getPushState();
  if (state === 'unsupported' || state === 'denied') return state;

  const permission =
    state === 'granted' ? state : await Notification.requestPermission();
  if (permission !== 'granted') return permission;

  await syncPushToken();
  return 'granted';
}

// Al cerrar sesión el dispositivo deja de recibir los avisos de esa cuenta.
// Nunca lanza: no debe frenar el cierre de sesión
export async function forgetPushToken(): Promise<void> {
  try {
    if (!(await isSupported()) || Notification.permission !== 'granted') {
      return;
    }
    await deleteToken(getMessaging(getApp()));
  } catch (error) {
    console.error('No se pudo olvidar el token de notificaciones:', error);
  }
}
