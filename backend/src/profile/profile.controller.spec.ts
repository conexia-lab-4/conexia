import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AuthenticatedUser } from '../auth/current-user.decorator';

describe('ProfileController', () => {
  let controller: ProfileController;
  let serviceMock: { getProfile: jest.Mock; upsertProfile: jest.Mock };

  beforeEach(async () => {
    serviceMock = {
      getProfile: jest.fn(),
      upsertProfile: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useValue: serviceMock }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();
    controller = module.get<ProfileController>(ProfileController);
  });

  it('la ruta está protegida por FirebaseAuthGuard', () => {
    const guards = Reflect.getMetadata('__guards__', ProfileController) as
      (new () => unknown)[] | undefined;
    expect(guards).toContain(FirebaseAuthGuard);
  });

  it('getProfile usa el userId del usuario autenticado, no uno externo', async () => {
    const user: AuthenticatedUser = { id: 'user-autenticado' };
    serviceMock.getProfile.mockResolvedValue({ id: 'profile-1' });

    await controller.getProfile(user);

    expect(serviceMock.getProfile).toHaveBeenCalledWith('user-autenticado');
  });

  it('upsertProfile usa el userId del usuario autenticado, ignorando cualquier otro id', async () => {
    const user: AuthenticatedUser = { id: 'user-autenticado' };
    const dto = {
      university: 'Austral',
      career: 'Ingeniería en Informática',
      year: 2,
      campus: 'Pilar',
      hasCar: false,
    };
    serviceMock.upsertProfile.mockResolvedValue({ id: 'profile-1' });

    await controller.upsertProfile(user, dto);

    expect(serviceMock.upsertProfile).toHaveBeenCalledWith(
      'user-autenticado',
      dto,
    );
  });
});
