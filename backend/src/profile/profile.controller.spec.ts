import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

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
    const request = { user: { id: 'user-autenticado' } } as never;
    serviceMock.getProfile.mockResolvedValue({ id: 'profile-1' });

    await controller.getProfile(request);

    expect(serviceMock.getProfile).toHaveBeenCalledWith('user-autenticado');
  });

  it('upsertProfile usa el userId del usuario autenticado, ignorando cualquier otro id', async () => {
    const request = { user: { id: 'user-autenticado' } } as never;
    const dto = {
      university: 'Austral',
      career: 'Ingeniería en Informática',
      year: 2,
      campus: 'Pilar',
      hasCar: false,
    };
    serviceMock.upsertProfile.mockResolvedValue({ id: 'profile-1' });

    await controller.upsertProfile(request, dto);

    expect(serviceMock.upsertProfile).toHaveBeenCalledWith(
      'user-autenticado',
      dto,
    );
  });
});
