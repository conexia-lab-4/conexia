import { randomUUID } from 'node:crypto';
import * as admin from 'firebase-admin';

// Comprueba con las credenciales del backend que Firestore y FCM responden.
// No toca datos reales ni manda notificaciones: escribe y borra un documento de
// prueba y hace un envío dryRun (FCM lo valida sin entregarlo)
async function main() {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

  const doc = admin.firestore().collection('_healthcheck').doc(randomUUID());
  await doc.set({ createdAt: admin.firestore.FieldValue.serverTimestamp() });
  const snapshot = await doc.get();
  await doc.delete();
  if (!snapshot.exists)
    throw new Error('No se pudo leer el documento de prueba');
  console.log('Firestore: lectura y escritura OK');

  await admin
    .messaging()
    .send({ topic: 'healthcheck', notification: { title: 'Prueba' } }, true);
  console.log('FCM: credenciales OK (dryRun)');
}

main().catch((error: unknown) => {
  console.error(
    'Falló la verificación de Firebase:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
