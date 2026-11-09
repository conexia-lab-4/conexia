# Notificaciones: contrato para la integración

Todos los endpoints requieren sesión: header `Authorization: Bearer <idToken de Firebase>` con el email verificado. Sin eso responden `401` (sin header o token inválido) o `403` (email sin verificar).

El usuario siempre sale de la sesión. Ningún endpoint recibe un destinatario en el body.

## Modelo de una notificación

```json
{
  "id": "5f7eef0f-f957-4a7b-b4db-f386bc07c2d6",
  "userId": "flvQAIEdk8QEyvsypdnu4iJsJ4M2",
  "title": "Nuevo pasajero",
  "message": "Lucía se sumó al viaje de Pilar a Palermo",
  "type": "TRIP",
  "referenceId": "0d3c2a1e-6c1f-4f0e-9a52-0f3a1c9d8b77",
  "readAt": null,
  "createdAt": "2026-11-05T01:02:55.920Z"
}
```

| Campo | Descripción |
|---|---|
| `type` | `TRIP`, `CHAT` o `MATCH` |
| `referenceId` | A qué apunta la notificación, según el `type` (ver abajo). Puede ser `null` |
| `readAt` | `null` mientras no se leyó; fecha de la primera lectura después |
| `createdAt` | Fecha de creación (ISO 8601, UTC) |

`referenceId` y a dónde navegar en la app:

| `type` | `referenceId` | Pantalla |
|---|---|---|
| `TRIP` | id del viaje | `/trips/:referenceId` |
| `CHAT` | id del viaje (es también el id de la conversación) | `/chats/:referenceId` |
| `MATCH` | id del match | `/matches/:referenceId` |

`referenceId` es un texto sin relación con las tablas: la notificación sigue existiendo aunque el viaje se elimine. Si al abrirla el viaje, el chat o el match ya no están disponibles, la app tiene que mostrar un estado controlado.

## Eventos que generan una notificación

Los avisos se generan **después de confirmar** la operación. Si la operación falla, no se genera ningún aviso.

| Evento | Cuándo | Destinatarios | `type` | `referenceId` |
|---|---|---|---|---|
| Mensaje de chat | Un participante envía un mensaje y el cliente avisa al backend (ver más abajo) | Conductor y pasajeros del viaje, menos el autor | `CHAT` | id del viaje |
| Nuevo match | El matching crea una coincidencia que nunca había existido | El pasajero y el conductor de esa coincidencia, solo ellos | Pasajero: `MATCH`. Conductor: `TRIP` | Pasajero: id del match. Conductor: id del viaje |
| Pasajero que se suma | `POST /trips/:id/passengers`, o aceptar un match | Conductor y demás pasajeros, menos quien se sumó | `TRIP` | id del viaje |
| Pasajero que sale | `DELETE /trips/:id/passengers` | Conductor y pasajeros que siguen, menos quien salió | `TRIP` | id del viaje |
| Cancelación del viaje | `DELETE /trips/:id` del conductor | Todos los pasajeros que participaban, no el conductor | `TRIP` | id del viaje (ya eliminado) |

El conductor recibe el aviso de nuevo match con el viaje como referencia porque no puede abrir un match: el detalle del match es solo del pasajero.

En la cancelación, los destinatarios se toman antes de eliminar el viaje, así que el aviso llega y persiste aunque el viaje ya no exista.

### Una sola notificación por evento y destinatario

Cada notificación guarda una clave del evento (`eventKey`) y hay un índice único `(userId, eventKey)`. Repetir el procesamiento del mismo evento no duplica el registro ni vuelve a enviar el push.

| Evento | Clave |
|---|---|
| Mensaje de chat | `chat:{tripId}:{messageId}` |
| Nuevo match | `match:{matchId}` |
| Pasajero que se suma | `join:{id de la participación}` |
| Pasajero que sale | `leave:{tripId}:{userId}:{momento de la salida}` |
| Cancelación | `cancel:{tripId}` |

- Un pasajero que entra, sale y vuelve a entrar genera un aviso por cada ingreso: cada ingreso es una participación nueva.
- Un recálculo del matching sin coincidencias nuevas no avisa. Un par que ya tuvo un match, aunque haya quedado invalidado, tampoco vuelve a avisar.

### Qué pasa si algo falla

- La notificación se guarda en la base **siempre**, aunque el destinatario no tenga token FCM o no haya habilitado push.
- Un fallo al guardar o al enviar el push no rompe la operación original (unirse, salir, cancelar, aceptar, chatear) ni borra el registro.
- Si FCM responde que el token ya no es válido, se borra el token de ese usuario.

## Push FCM

Si el destinatario tiene token, se envía un mensaje FCM **solo de datos** (sin la clave `notification`), para que la app decida si mostrarlo: con la app visible solo se muestra in-app; fuera de la app, el service worker muestra el aviso del sistema.

```json
{
  "notificationId": "5f7eef0f-f957-4a7b-b4db-f386bc07c2d6",
  "type": "TRIP",
  "referenceId": "0d3c2a1e-6c1f-4f0e-9a52-0f3a1c9d8b77",
  "title": "Nuevo pasajero",
  "body": "Lucía se sumó al viaje de Pilar a Palermo"
}
```

Todos los valores son texto. `notificationId` permite marcar como leída la notificación al tocar el push. Con `type` y `referenceId` la app arma la ruta de la tabla de arriba.

El texto de un mensaje de chat se incluye en `body`, acortado a 100 caracteres.

## Avisar un mensaje de chat

Los mensajes se escriben directo en Firestore desde el cliente, así que el backend no se entera solo. Después de enviar, el cliente avisa:

`POST /chat/:tripId/messages/:messageId/notify`

- `204 No Content` sin body.
- `403` si quien avisa no participa del viaje o no es el autor del mensaje.
- `404` si el viaje o el mensaje no existen, o el id del mensaje no es válido.
- El backend verifica en Firestore que el mensaje existe y es de quien avisa. Es idempotente: avisar dos veces el mismo mensaje no duplica nada.
- El frontend lo llama sin esperar la respuesta; si falla, el chat no se ve afectado.

## Registrar o actualizar el token FCM

`PUT /notifications/token`

Body:

```json
{ "token": "<token FCM>" }
```

- `204 No Content` sin body.
- `400` si el token falta, está vacío o supera los 4096 caracteres.
- Es idempotente: repetir el mismo token no genera duplicados, y enviar otro reemplaza el anterior.
- Hay un solo token por usuario. Si el mismo token ya estaba registrado para otro usuario (mismo dispositivo, otra sesión), se le quita a ese usuario.

## Listar mis notificaciones

`GET /notifications`

- `200` con un array de notificaciones, de la más reciente a la más antigua. Solo las del usuario autenticado. Array vacío si no tiene ninguna.
- No tiene paginación: devuelve todas.

## Contador de no leídas

`GET /notifications/unread-count`

```json
{ "count": 2 }
```

- `200`. Devuelve `{ "count": 0 }` cuando no hay pendientes.
- Es el endpoint pensado para el polling de la campanita.

## Marcar como leída

`PATCH /notifications/:id/read`

- `200` con la notificación actualizada (`readAt` con fecha).
- Es idempotente: si ya estaba leída devuelve la misma notificación con su `readAt` original y el contador no cambia.
- `404` si no existe o es de otro usuario (no se distingue, para no revelar que existe).

## Consistencia entre listado y contador

Después de marcar una notificación como leída, el siguiente `GET /notifications` la muestra con `readAt` con fecha y `GET /notifications/unread-count` baja en uno. Para refrescar la campanita conviene consultar ambos.

## Generar notificaciones (uso interno)

No hay endpoint público para crear notificaciones. Los eventos de arriba salen de `NotificationEventsService`, exportado por `NotificationsModule`, que arma el texto y los destinatarios de cada uno y usa `NotificationsService.notify`:

```ts
await notificationsService.notify({
  recipientIds: [driverId, otherPassengerId],
  title: 'Nuevo pasajero',
  message: 'Lucía se sumó al viaje de Pilar a Palermo',
  type: 'TRIP', // 'TRIP' | 'CHAT' | 'MATCH'
  referenceId: tripId,
  eventKey: `join:${participationId}`, // identifica el evento
});
```

`notify` nunca lanza error, para no romper la operación que lo originó.

## Endpoint de prueba (solo con `E2E_TESTING=true`)

`POST /test-utils/notifications` (sin autenticación; responde `404` si `E2E_TESTING` no es `true`).

```json
{
  "email": "usuario@example.com",
  "title": "Nuevo pasajero",
  "message": "Se sumó alguien a tu viaje",
  "type": "TRIP",
  "referenceId": "trip-demo"
}
```

- `201` con la notificación creada.
- El usuario tiene que haber hecho al menos una petición autenticada antes (ahí se crea su registro).
- Nunca debe activarse en producción.