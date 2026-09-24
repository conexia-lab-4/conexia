import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesController } from './schedules.controller';
import { SubjectsService } from './subjects.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

describe('SchedulesController', () => {
  let controller: SchedulesController;
  let serviceMock: { updateSchedule: jest.Mock; removeSchedule: jest.Mock };

  beforeEach(async () => {
    serviceMock = {
      updateSchedule: jest.fn(),
      removeSchedule: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulesController],
      providers: [{ provide: SubjectsService, useValue: serviceMock }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();
    controller = module.get<SchedulesController>(SchedulesController);
  });

  it('la ruta está protegida por FirebaseAuthGuard', () => {
    const guards = Reflect.getMetadata('__guards__', SchedulesController) as
      (new () => unknown)[] | undefined;
    expect(guards).toContain(FirebaseAuthGuard);
  });

  it('update usa el userId del usuario autenticado y el id de la ruta', async () => {
    const user: AuthenticatedUser = { id: 'user-autenticado' };
    const dto: UpdateScheduleDto = { startTime: '09:00' };
    serviceMock.updateSchedule.mockResolvedValue({ id: 'schedule-1' });

    await controller.update(user, 'schedule-1', dto);

    expect(serviceMock.updateSchedule).toHaveBeenCalledWith(
      'user-autenticado',
      'schedule-1',
      dto,
    );
  });

  it('remove usa el userId del usuario autenticado y el id de la ruta', async () => {
    const user: AuthenticatedUser = { id: 'user-autenticado' };
    serviceMock.removeSchedule.mockResolvedValue(undefined);

    await controller.remove(user, 'schedule-1');

    expect(serviceMock.removeSchedule).toHaveBeenCalledWith(
      'user-autenticado',
      'schedule-1',
    );
  });
});
