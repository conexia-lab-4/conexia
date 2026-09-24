import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

describe('FirebaseAuthGuard', () => {
  let guard: FirebaseAuthGuard;
  let firebaseAdminMock: { auth: jest.Mock };
  let verifyIdTokenMock: jest.Mock;
  let prismaMock: { user: { upsert: jest.Mock } };

  const buildContext = (authHeader?: string): ExecutionContext => {
    const request = { headers: { authorization: authHeader } };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    verifyIdTokenMock = jest.fn();
    firebaseAdminMock = {
      auth: jest.fn(() => ({ verifyIdToken: verifyIdTokenMock })),
    };
    prismaMock = { user: { upsert: jest.fn() } };

    guard = new FirebaseAuthGuard(
      firebaseAdminMock as never,
      prismaMock as unknown as PrismaService,
    );
  });

  it('rechaza una request sin token', async () => {
    const context = buildContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza una request con token inválido', async () => {
    verifyIdTokenMock.mockRejectedValue(new Error('invalid token'));
    const context = buildContext('Bearer token-invalido');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza una request con token válido pero email no verificado', async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: 'uid-123',
      email: '[email protected]',
      email_verified: false,
    });
    const context = buildContext('Bearer token-valido');

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(prismaMock.user.upsert).not.toHaveBeenCalled();
  });

  it('permite el acceso con token válido y email verificado', async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: 'uid-123',
      email: '[email protected]',
      email_verified: true,
    });
    prismaMock.user.upsert.mockResolvedValue({
      id: 'uid-123',
      email: '[email protected]',
    });
    const context = buildContext('Bearer token-valido');

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(prismaMock.user.upsert).toHaveBeenCalledWith({
      where: { id: 'uid-123' },
      update: {},
      create: { id: 'uid-123', email: '[email protected]' },
    });
  });
});
