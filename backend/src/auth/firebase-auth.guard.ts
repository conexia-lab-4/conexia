import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid authorization header',
      );
    }

    const idToken = authHeader.split('Bearer ')[1];

    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await this.firebaseAdmin.auth().verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!decodedToken.email_verified) {
      throw new ForbiddenException('Email not verified');
    }

    const { uid, email } = decodedToken;

    const user = await this.prisma.user.upsert({
      where: { id: uid },
      update: {},
      create: { id: uid, email: email ?? '' },
    });

    (request as Request & { user: typeof user }).user = user;

    return true;
  }
}
