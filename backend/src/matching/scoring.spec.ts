import {
  ALGORITHM_VERSION,
  computeDetourScore,
  computeScore,
  computeTimeScore,
  isDetourWithinTolerance,
  isTimeDeltaAllowed,
  meetsMinimumScore,
  minutesBetween,
  normalizeDetourKm,
} from './scoring';

describe('scoring v1', () => {
  it('usa la versión de algoritmo deterministic-v1', () => {
    expect(ALGORITHM_VERSION).toBe('deterministic-v1');
  });

  describe('minutesBetween', () => {
    it('devuelve la diferencia absoluta en minutos sin importar el orden', () => {
      const a = new Date('2026-10-05T08:00:00.000Z');
      const b = new Date('2026-10-05T08:30:00.000Z');

      expect(minutesBetween(a, b)).toBe(30);
      expect(minutesBetween(b, a)).toBe(30);
    });
  });

  describe('filtros', () => {
    it('con tolerancia 0 solo pasa un desvío de 0', () => {
      expect(isDetourWithinTolerance(0, 0)).toBe(true);
      expect(isDetourWithinTolerance(0.01, 0)).toBe(false);
    });

    it('acepta un desvío menor o igual a la tolerancia', () => {
      expect(isDetourWithinTolerance(5, 10)).toBe(true);
      expect(isDetourWithinTolerance(10, 10)).toBe(true);
      expect(isDetourWithinTolerance(10.5, 10)).toBe(false);
    });

    it('acepta una diferencia horaria de hasta 30 minutos', () => {
      expect(isTimeDeltaAllowed(30)).toBe(true);
      expect(isTimeDeltaAllowed(30.5)).toBe(false);
    });
  });

  describe('computeDetourScore', () => {
    it('con tolerancia 0 y desvío 0 vale 1', () => {
      expect(computeDetourScore(0, 0)).toBe(1);
    });

    it('con tolerancia 0 y desvío mayor a 0 vale 0', () => {
      expect(computeDetourScore(1, 0)).toBe(0);
    });

    it('baja linealmente hasta la tolerancia', () => {
      expect(computeDetourScore(0, 10)).toBe(1);
      expect(computeDetourScore(5, 10)).toBe(0.5);
      expect(computeDetourScore(10, 10)).toBe(0);
    });

    it('se limita al rango 0..1', () => {
      expect(computeDetourScore(20, 10)).toBe(0);
      expect(computeDetourScore(-2, 10)).toBe(1);
    });
  });

  describe('computeTimeScore', () => {
    it('baja linealmente hasta los 30 minutos', () => {
      expect(computeTimeScore(0)).toBe(1);
      expect(computeTimeScore(15)).toBe(0.5);
      expect(computeTimeScore(30)).toBe(0);
    });

    it('se limita al rango 0..1', () => {
      expect(computeTimeScore(45)).toBe(0);
    });
  });

  describe('computeScore', () => {
    it('un match perfecto vale 100', () => {
      const score = computeScore({
        detourKm: 0,
        detourToleranceKm: 5,
        departureDeltaMinutes: 0,
        arrivalDeltaMinutes: 0,
      });

      expect(score).toBe(100);
    });

    it('con tolerancia 0 y desvío 0 el componente de desvío puntúa completo', () => {
      const score = computeScore({
        detourKm: 0,
        detourToleranceKm: 0,
        departureDeltaMinutes: 0,
        arrivalDeltaMinutes: 0,
      });

      expect(score).toBe(100);
    });

    it('un score de exactamente 60 supera el umbral', () => {
      const score = computeScore({
        detourKm: 5,
        detourToleranceKm: 10,
        departureDeltaMinutes: 15,
        arrivalDeltaMinutes: 0,
      });

      expect(score).toBe(60);
      expect(meetsMinimumScore(score)).toBe(true);
    });

    it('un score apenas menor a 60 no supera el umbral', () => {
      const score = computeScore({
        detourKm: 5,
        detourToleranceKm: 10,
        departureDeltaMinutes: 16,
        arrivalDeltaMinutes: 0,
      });

      expect(score).toBeLessThan(60);
      expect(meetsMinimumScore(score)).toBe(false);
    });

    it('en el límite de todos los filtros el score es 0', () => {
      const score = computeScore({
        detourKm: 10,
        detourToleranceKm: 10,
        departureDeltaMinutes: 30,
        arrivalDeltaMinutes: 30,
      });

      expect(score).toBe(0);
    });
  });

  describe('normalizeDetourKm', () => {
    it('trata como 0 un desvío menor a 5 metros', () => {
      expect(normalizeDetourKm(0.004)).toBe(0);
    });

    it('redondea a 2 decimales', () => {
      expect(normalizeDetourKm(0.006)).toBe(0.01);
      expect(normalizeDetourKm(2.346)).toBe(2.35);
    });

    it('nunca devuelve un desvío negativo', () => {
      expect(normalizeDetourKm(-1.5)).toBe(0);
    });
  });
});
