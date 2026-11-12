// Recibe los push de FCM con la app cerrada o en segundo plano. Los mensajes
// llegan solo con datos (sin "notification"): acá se decide si mostrar el
// aviso del sistema

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Misma regla que lib/notificationFormat.ts: a qué pantalla lleva cada tipo
function getPath(data) {
  if (!data.referenceId) return null;

  const id = encodeURIComponent(data.referenceId);
  if (data.type === 'TRIP') return `/trips/${id}`;
  if (data.type === 'CHAT') return `/chats/${id}`;
  if (data.type === 'MATCH') return `/matches/${id}`;
  return null;
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const data = payload.data || {};

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const visible = windows.filter(
        (client) => client.visibilityState === 'visible',
      );

      // Con la app a la vista no hay aviso del sistema: solo se le avisa a la
      // página para que actualice las notificaciones de adentro
      if (visible.length > 0) {
        visible.forEach((client) =>
          client.postMessage({ type: 'conexia-push', data }),
        );
        return;
      }

      await self.registration.showNotification(data.title || 'Conexia', {
        body: data.body || '',
        tag: data.notificationId,
        data: {
          notificationId: data.notificationId,
          type: data.type,
          referenceId: data.referenceId,
        },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const path = getPath(data) || '/notifications';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Si la app ya está abierta se la enfoca y se le pide que navegue
      if (windows.length > 0) {
        const client = windows[0];
        await client.focus();
        client.postMessage({ type: 'conexia-push-click', data });
        return;
      }

      // Con la app cerrada se abre directo en la pantalla, con el id de la
      // notificación para marcarla como leída al entrar
      const query = data.notificationId
        ? `?notification=${encodeURIComponent(data.notificationId)}`
        : '';
      await self.clients.openWindow(`${path}${query}`);
    })(),
  );
});
