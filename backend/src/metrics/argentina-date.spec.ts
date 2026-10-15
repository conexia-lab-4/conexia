import { addDays, argentinaDate, dayToDate } from './argentina-date';

describe('argentinaDate', () => {
  it('devuelve el mismo día al mediodía', () => {
    expect(argentinaDate(new Date('2026-10-14T15:00:00Z'))).toEqual(
      new Date('2026-10-14T00:00:00Z'),
    );
  });

  it('a las 23:30 de Argentina sigue siendo ese día aunque en UTC ya sea el siguiente', () => {
    expect(argentinaDate(new Date('2026-10-15T02:30:00Z'))).toEqual(
      new Date('2026-10-14T00:00:00Z'),
    );
  });

  it('a las 00:30 de Argentina ya es el día siguiente', () => {
    expect(argentinaDate(new Date('2026-10-15T03:30:00Z'))).toEqual(
      new Date('2026-10-15T00:00:00Z'),
    );
  });
});

describe('addDays', () => {
  it('cruza el cambio de mes', () => {
    expect(addDays('2026-03-02', -6)).toBe('2026-02-24');
  });
});

describe('dayToDate', () => {
  it.each(['2026-13-01', '14/10/2026', ''])('rechaza "%s"', (day) => {
    expect(() => dayToDate(day)).toThrow('Fecha inválida');
  });
});
