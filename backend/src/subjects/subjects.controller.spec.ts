import { Test, TestingModule } from '@nestjs/testing';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';
import { ScheduleExtractionService } from './schedule-extraction.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

describe('SubjectsController', () => {
  let controller: SubjectsController;
  let serviceMock: {
    create: jest.Mock;
    findAllByUser: jest.Mock;
    updateSubject: jest.Mock;
    removeSubject: jest.Mock;
  };
  let extractionMock: { extract: jest.Mock };

  beforeEach(async () => {
    serviceMock = {
      create: jest.fn(),
      findAllByUser: jest.fn(),
      updateSubject: jest.fn(),
      removeSubject: jest.fn(),
    };
    extractionMock = { extract: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubjectsController],
      providers: [
        { provide: SubjectsService, useValue: serviceMock },
        { provide: ScheduleExtractionService, useValue: extractionMock },
      ],
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
      color: 'BLUE',
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

  it('update usa el userId del usuario autenticado y el id de la ruta', async () => {
    const user: AuthenticatedUser = { id: 'user-autenticado' };
    const dto: UpdateSubjectDto = { name: 'Análisis II' };
    serviceMock.updateSubject.mockResolvedValue({ id: 'subject-1' });

    await controller.update(user, 'subject-1', dto);

    expect(serviceMock.updateSubject).toHaveBeenCalledWith(
      'user-autenticado',
      'subject-1',
      dto,
    );
  });

  it('remove usa el userId del usuario autenticado y el id de la ruta', async () => {
    const user: AuthenticatedUser = { id: 'user-autenticado' };
    serviceMock.removeSubject.mockResolvedValue(undefined);

    await controller.remove(user, 'subject-1');

    expect(serviceMock.removeSubject).toHaveBeenCalledWith(
      'user-autenticado',
      'subject-1',
    );
  });

  it('extract devuelve el borrador leído de la imagen sin guardar materias', async () => {
    const image = {
      buffer: Buffer.from('img'),
      mimetype: 'image/png',
    } as Express.Multer.File;
    const draft = { subjects: [] };
    extractionMock.extract.mockResolvedValue(draft);

    const result = await controller.extract(image);

    expect(extractionMock.extract).toHaveBeenCalledWith(image);
    expect(result).toBe(draft);
    expect(serviceMock.create).not.toHaveBeenCalled();
  });
});
