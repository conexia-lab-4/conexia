import { Inject, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class AvatarStorageService {
  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
  ) {}

  // Un archivo por usuario: subir otra foto reemplaza la anterior. La URL
  // queda en el photoURL de Firebase Auth, junto al displayName.
  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const bucket = this.firebaseAdmin.storage().bucket();
    const path = `avatars/${userId}`;

    await bucket.file(path).save(file.buffer, {
      contentType: file.mimetype,
      metadata: { cacheControl: 'public, max-age=300' },
    });

    // `v` cambia en cada subida para que el navegador no muestre la foto vieja
    const photoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&v=${Date.now()}`;

    await this.firebaseAdmin.auth().updateUser(userId, { photoURL: photoUrl });

    return photoUrl;
  }
}
