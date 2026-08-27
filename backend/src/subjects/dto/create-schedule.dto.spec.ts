import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateScheduleDto } from './create-schedule.dto';

describe('CreateScheduleDto', () => {
  it('es válido cuando startTime es anterior a endTime', async () => {
    const dto = plainToInstance(CreateScheduleDto, {
      dayOfWeek: 'MONDAY',
      startTime: '08:00',
      endTime: '10:00',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rechaza cuando startTime es posterior o igual a endTime', async () => {
    const dto = plainToInstance(CreateScheduleDto, {
      dayOfWeek: 'TUESDAY',
      startTime: '10:00',
      endTime: '08:00',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);

    const constraints = errors[0].constraints;
    expect(constraints).toBeDefined();
    expect(constraints?.EndTimeAfterStartTime).toContain('TUESDAY');
  });
});
