import { Inject, Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

// Firebase permite hasta 100 identificadores por consulta
const BATCH_SIZE = 100;

export type PublicUser = {
  displayName: string | null;
  photoUrl: string | null;
};

@Injectable()
export class DisplayNamesService {
  private readonly logger = new Logger(DisplayNamesService.name);

  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
  ) {}

  // El nombre y la foto viven en Firebase, no en la base. Si la consulta
  // falla, la API sigue respondiendo y esas personas quedan sin datos.
  async getPublicUsers(userIds: string[]): Promise<Map<string, PublicUser>> {
    const users = new Map<string, PublicUser>();
    const uniqueIds = [...new Set(userIds)];

    for (let index = 0; index < uniqueIds.length; index += BATCH_SIZE) {
      const batch = uniqueIds.slice(index, index + BATCH_SIZE);

      try {
        const result = await this.firebaseAdmin
          .auth()
          .getUsers(batch.map((uid) => ({ uid })));

        for (const user of result.users) {
          users.set(user.uid, {
            displayName: user.displayName?.trim() || null,
            photoUrl: user.photoURL ?? null,
          });
        }
      } catch (error) {
        this.logger.warn(
          `No se pudieron obtener los datos de los usuarios: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return users;
  }
}
