import { Test, TestingModule } from '@nestjs/testing';
import { CampusesController } from './campuses.controller';
import { UniversitiesService } from './universities.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

describe('CampusesController', () => {
  let controller: CampusesController;
  let serviceMock: { findAllCampuses: jest.Mock };

  beforeEach(async () => {
    serviceMock = { findAllCampuses: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampusesController],
      providers: [{ provide: UniversitiesService, useValue: serviceMock }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();
    controller = module.get<CampusesController>(CampusesController);
  });

  it('la ruta está protegida por FirebaseAuthGuard', () => {
    const guards = Reflect.getMetadata('__guards__', CampusesController) as
      (new () => unknown)[] | undefined;
    expect(guards).toContain(FirebaseAuthGuard);
  });

  it('findAll devuelve las sedes del servicio', async () => {
    const campuses = [{ id: 'ua-pilar', name: 'Sede Pilar' }];
    serviceMock.findAllCampuses.mockResolvedValue(campuses);

    await expect(controller.findAll()).resolves.toEqual(campuses);
  });
});
