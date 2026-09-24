import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateSubjectDto } from './create-subject.dto';

describe('CreateSubjectDto', () => {
  const baseSchedules = [
    { dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '10:00' },
  ];

  it('es válido con un color soportado', async () => {
    const dto = plainToInstance(CreateSubjectDto, {
      name: 'Análisis Matemático',
      color: 'GREEN',
      schedules: baseSchedules,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rechaza un color que no existe en SubjectColor', async () => {
    const dto = plainToInstance(CreateSubjectDto, {
      name: 'Análisis Matemático',
      color: 'BLACK',
      schedules: baseSchedules,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'color')).toBe(true);
  });

  it('rechaza cuando no se envía color', async () => {
    const dto = plainToInstance(CreateSubjectDto, {
      name: 'Análisis Matemático',
      schedules: baseSchedules,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'color')).toBe(true);
  });

  it('es válido sin visibleProfile (usa el default del backend)', async () => {
    const dto = plainToInstance(CreateSubjectDto, {
      name: 'Análisis Matemático',
      color: 'BLUE',
      schedules: baseSchedules,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rechaza cuando visibleProfile no es booleano', async () => {
    const dto = plainToInstance(CreateSubjectDto, {
      name: 'Análisis Matemático',
      color: 'BLUE',
      visibleProfile: 'si',
      schedules: baseSchedules,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'visibleProfile')).toBe(
      true,
    );
  });
});
