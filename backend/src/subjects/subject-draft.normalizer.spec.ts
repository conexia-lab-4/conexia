import { normalizeSubjectDraft } from './subject-draft.normalizer';

const schedule = (overrides: Record<string, unknown>) => ({
  dayOfWeek: 'MONDAY',
  startTime: '08:00',
  endTime: '10:00',
  classroom: 'A1',
  ...overrides,
});

const subjectWith = (schedules: unknown, overrides = {}) => ({
  name: 'Álgebra',
  career: 'Ingeniería',
  campus: 'Pilar',
  color: '',
  schedules,
  ...overrides,
});

const firstSchedule = (raw: Record<string, unknown>) =>
  normalizeSubjectDraft({ subjects: [subjectWith([schedule(raw)])] })
    .subjects[0].schedules[0];

describe('normalizeSubjectDraft', () => {
  it('devuelve las materias con sus datos recortados', () => {
    const result = normalizeSubjectDraft({
      subjects: [subjectWith([schedule({})], { name: '  Álgebra  ' })],
    });

    expect(result).toEqual({
      subjects: [
        {
          name: 'Álgebra',
          career: 'Ingeniería',
          campus: 'Pilar',
          color: '',
          schedules: [
            {
              dayOfWeek: 'MONDAY',
              startTime: '08:00',
              endTime: '10:00',
              classroom: 'A1',
            },
          ],
        },
      ],
    });
  });

  it('lleva las horas al formato HH:mm', () => {
    expect(firstSchedule({ startTime: '8:00' }).startTime).toBe('08:00');
    expect(firstSchedule({ startTime: '8.30hs' }).startTime).toBe('08:30');
    expect(firstSchedule({ endTime: '18:45 h' }).endTime).toBe('18:45');
  });

  it('deja vacía una hora que no se puede leer', () => {
    expect(firstSchedule({ startTime: '25:00' }).startTime).toBe('');
    expect(firstSchedule({ startTime: '8 a 10' }).startTime).toBe('');
    expect(firstSchedule({ endTime: 830 }).endTime).toBe('');
  });

  it('acepta los días en inglés o en español y vacía los desconocidos', () => {
    expect(firstSchedule({ dayOfWeek: 'friday' }).dayOfWeek).toBe('FRIDAY');
    expect(firstSchedule({ dayOfWeek: 'Miércoles' }).dayOfWeek).toBe(
      'WEDNESDAY',
    );
    expect(firstSchedule({ dayOfWeek: 'FUNDAY' }).dayOfWeek).toBe('');
  });

  it('solo acepta colores existentes, sin inventarlos', () => {
    const [valid, invented] = normalizeSubjectDraft({
      subjects: [
        subjectWith([], { color: 'green' }),
        subjectWith([], { color: 'BLACK' }),
      ],
    }).subjects;

    expect(valid.color).toBe('GREEN');
    expect(invented.color).toBe('');
  });

  it('conserva un horario leído a medias, con lo que falta vacío', () => {
    const result = normalizeSubjectDraft({
      subjects: [
        subjectWith([
          { dayOfWeek: 'TUESDAY' },
          schedule({ dayOfWeek: '', startTime: '8 a 10', endTime: '' }),
        ]),
      ],
    });

    expect(result.subjects[0].schedules).toEqual([
      { dayOfWeek: 'TUESDAY', startTime: '', endTime: '', classroom: '' },
      { dayOfWeek: '', startTime: '', endTime: '', classroom: 'A1' },
    ]);
  });

  it('admite varios horarios por materia', () => {
    const result = normalizeSubjectDraft({
      subjects: [
        subjectWith([
          schedule({ dayOfWeek: 'MONDAY' }),
          schedule({ dayOfWeek: 'THURSDAY' }),
        ]),
      ],
    });

    expect(result.subjects[0].schedules.map((item) => item.dayOfWeek)).toEqual([
      'MONDAY',
      'THURSDAY',
    ]);
  });

  it('descarta horarios sin ningún dato', () => {
    const result = normalizeSubjectDraft({
      subjects: [
        subjectWith([
          { dayOfWeek: '', startTime: '', endTime: '', classroom: '' },
          'basura',
        ]),
      ],
    });

    expect(result.subjects[0].schedules).toEqual([]);
  });

  it('devuelve schedules vacío cuando no se identificó ningún horario', () => {
    const result = normalizeSubjectDraft({
      subjects: [{ name: 'Física' }],
    });

    expect(result.subjects).toEqual([
      { name: 'Física', career: '', campus: '', color: '', schedules: [] },
    ]);
  });

  it('descarta materias sin ningún dato', () => {
    const result = normalizeSubjectDraft({
      subjects: [{ name: '', schedules: [] }, null],
    });

    expect(result.subjects).toEqual([]);
  });

  it.each([null, 'hola', 42, {}, { subjects: 'x' }])(
    'devuelve un borrador vacío ante una respuesta inválida (%p)',
    (raw) => {
      expect(normalizeSubjectDraft(raw)).toEqual({ subjects: [] });
    },
  );
});
