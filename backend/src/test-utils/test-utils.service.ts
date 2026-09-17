import { Inject, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TestUtilsService {
  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
    private readonly prisma: PrismaService,
  ) {}

  async verifyEmail(email: string): Promise<void> {
    const user = await this.firebaseAdmin.auth().getUserByEmail(email);
    await this.firebaseAdmin
      .auth()
      .updateUser(user.uid, { emailVerified: true });
  }

  async resetProfile(email: string): Promise<void> {
    const user = await this.firebaseAdmin.auth().getUserByEmail(email);
    await this.prisma.studentProfile.deleteMany({
      where: { userId: user.uid },
    });
  }

  async deleteUser(email: string): Promise<void> {
    let uid: string;
    try {
      uid = (await this.firebaseAdmin.auth().getUserByEmail(email)).uid;
    } catch {
      return;
    }

    await this.prisma.studentProfile.deleteMany({ where: { userId: uid } });
    await this.prisma.subject.deleteMany({ where: { userId: uid } });
    await this.prisma.user.deleteMany({ where: { id: uid } });
    await this.firebaseAdmin.auth().deleteUser(uid);
  }
}
