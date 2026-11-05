import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { RegisterFcmTokenDto } from './dto/register-fcm-token.dto';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let serviceMock: {
    registerToken: jest.Mock;
    findMine: jest.Mock;
    countUnread: jest.Mock;
    markAsRead: jest.Mock;
  };
  const user: AuthenticatedUser = { id: 'user-autenticado' };

  beforeEach(async () => {
    serviceMock = {
      registerToken: jest.fn(),
      findMine: jest.fn(),
      countUnread: jest.fn(),
      markAsRead: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: serviceMock }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();
    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('la ruta está protegida por FirebaseAuthGuard', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      NotificationsController,
    ) as (new () => unknown)[] | undefined;
    expect(guards).toContain(FirebaseAuthGuard);
  });

  it('registerToken guarda el token para el usuario autenticado', async () => {
    const dto: RegisterFcmTokenDto = { token: 'token-1' };
    serviceMock.registerToken.mockResolvedValue(undefined);

    await controller.registerToken(user, dto);

    expect(serviceMock.registerToken).toHaveBeenCalledWith(
      'user-autenticado',
      'token-1',
    );
  });

  it('findMine lista las del usuario autenticado', async () => {
    serviceMock.findMine.mockResolvedValue([]);

    await controller.findMine(user);

    expect(serviceMock.findMine).toHaveBeenCalledWith('user-autenticado');
  });

  it('countUnread cuenta las del usuario autenticado', async () => {
    serviceMock.countUnread.mockResolvedValue({ count: 0 });

    await controller.countUnread(user);

    expect(serviceMock.countUnread).toHaveBeenCalledWith('user-autenticado');
  });

  it('markAsRead usa el usuario autenticado y el id de la ruta', async () => {
    serviceMock.markAsRead.mockResolvedValue({ id: 'notification-1' });

    await controller.markAsRead(user, 'notification-1');

    expect(serviceMock.markAsRead).toHaveBeenCalledWith(
      'user-autenticado',
      'notification-1',
    );
  });
});
