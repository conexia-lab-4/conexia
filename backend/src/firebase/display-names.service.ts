import { Inject, Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

// Firebase permite hasta 100 identificadores por consulta
const BATCH_SIZE = 100;

@Injectable()
export class DisplayNamesService {
  private readonly logger = new Logger(DisplayNamesService.name);

  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
  ) {}

  // El nombre vive en Firebase, no en la base. Si la consulta falla, la API
  // sigue respondiendo y esas personas quedan sin nombre (null).
  async getDisplayNames(
    userIds: string[],
  ): Promise<Map<string, string | null>> {
    const names = new Map<string, string | null>();
    const uniqueIds = [...new Set(userIds)];

    for (let index = 0; index < uniqueIds.length; index += BATCH_SIZE) {
      const batch = uniqueIds.slice(index, index + BATCH_SIZE);

      try {
        const result = await this.firebaseAdmin
          .auth()
          .getUsers(batch.map((uid) => ({ uid })));

        for (const user of result.users) {
          names.set(user.uid, user.displayName?.trim() || null);
        }
      } catch (error) {
        this.logger.warn(
          `No se pudieron obtener los nombres: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return names;
  }
}
