import { Test, TestingModule } from '@nestjs/testing';
import { UniversitiesController } from './universities.controller';
import { UniversitiesService } from './universities.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

describe('UniversitiesController', () => {
  let controller: UniversitiesController;
  let serviceMock: { findAll: jest.Mock; findCampuses: jest.Mock };

  beforeEach(async () => {
    serviceMock = { findAll: jest.fn(), findCampuses: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UniversitiesController],
      providers: [{ provide: UniversitiesService, useValue: serviceMock }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();
    controller = module.get<UniversitiesController>(UniversitiesController);
  });

  it('la ruta está protegida por FirebaseAuthGuard', () => {
    const guards = Reflect.getMetadata('__guards__', UniversitiesController) as
      (new () => unknown)[] | undefined;
    expect(guards).toContain(FirebaseAuthGuard);
  });

  it('findAll devuelve las universidades del servicio', async () => {
    const universities = [{ id: 'ua', name: 'Universidad Austral' }];
    serviceMock.findAll.mockResolvedValue(universities);

    await expect(controller.findAll()).resolves.toEqual(universities);
  });

  it('findCampuses pide las sedes de la universidad de la ruta', async () => {
    serviceMock.findCampuses.mockResolvedValue([]);

    await controller.findCampuses('ua');

    expect(serviceMock.findCampuses).toHaveBeenCalledWith('ua');
  });
});
