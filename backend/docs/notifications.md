# Notificaciones: contrato para la integración (semana 3)

Todos los endpoints requieren sesión: header `Authorization: Bearer <idToken de Firebase>` con el email verificado. Sin eso responden `401` (sin header o token inválido) o `403` (email sin verificar).

El usuario siempre sale de la sesión. Ningún endpoint recibe un destinatario en el body.

## Modelo de una notificación

```json
{
  "id": "5f7eef0f-f957-4a7b-b4db-f386bc07c2d6",
  "userId": "flvQAIEdk8QEyvsypdnu4iJsJ4M2",
  "title": "Mensaje nuevo",
  "message": "Tenés un mensaje sin leer",
  "type": "CHAT",
  "referenceId": "chat-demo",
  "readAt": null,
  "createdAt": "2026-11-05T01:02:55.920Z"
}
```

| Campo | Descripción |
|---|---|
| `type` | `TRIP` o `CHAT` |
| `referenceId` | Id del viaje (`TRIP`) o del chat (`CHAT`). Puede ser `null` |
| `readAt` | `null` mientras no se leyó; fecha de la primera lectura después |
| `createdAt` | Fecha de creación (ISO 8601, UTC) |

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
- No envía ninguna notificación push.

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

## Crear notificaciones (uso interno)

No hay endpoint público para crear notificaciones. Desde otros módulos del backend se usa `NotificationsService.create`, que está exportado por `NotificationsModule`:

```ts
await notificationsService.create({
  userId, // destinatario
  title: 'Nuevo pasajero',
  message: 'Se sumó alguien a tu viaje',
  type: 'TRIP', // 'TRIP' | 'CHAT'
  referenceId: tripId, // opcional
});
```

La notificación se guarda siempre, aunque el usuario no tenga token FCM o no haya habilitado push. Enviar el push queda para la semana 3.

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