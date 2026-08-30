import { Test, TestingModule } from '@nestjs/testing';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { CreateSubjectDto } from './dto/create-subject.dto';

describe('SubjectsController', () => {
  let controller: SubjectsController;
  let serviceMock: { create: jest.Mock; findAllByUser: jest.Mock };

  beforeEach(async () => {
    serviceMock = {
      create: jest.fn(),
      findAllByUser: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubjectsController],
      providers: [{ provide: SubjectsService, useValue: serviceMock }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();
    controller = module.get<SubjectsController>(SubjectsController);
  });

  it('la ruta está protegida por FirebaseAuthGuard', () => {
    const guards = Reflect.getMetadata('__guards__', SubjectsController) as
      (new () => unknown)[] | undefined;
    expect(guards).toContain(FirebaseAuthGuard);
  });

  it('create usa el userId del usuario autenticado, ignorando cualquier otro id', async () => {
    const user: AuthenticatedUser = { id: 'user-autenticado' };
    const dto: CreateSubjectDto = {
      name: 'Análisis Matemático',
      schedules: [
        { dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '10:00' },
      ],
    };
    serviceMock.create.mockResolvedValue({ id: 'subject-1' });

    await controller.create(user, dto);

    expect(serviceMock.create).toHaveBeenCalledWith('user-autenticado', dto);
  });

  it('findAll usa el userId del usuario autenticado, no uno externo', async () => {
    const user: AuthenticatedUser = { id: 'user-autenticado' };
    serviceMock.findAllByUser.mockResolvedValue([]);

    await controller.findAll(user);

    expect(serviceMock.findAllByUser).toHaveBeenCalledWith('user-autenticado');
  });
});
