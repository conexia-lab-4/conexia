import { estimateFuel, parseConsumption, roundTo } from './fuel-estimate';

describe('estimateFuel', () => {
  it('calcula litros y costo con el ejemplo del ticket', () => {
    expect(estimateFuel(50, 8, 1500)).toEqual({ liters: 4, costArs: 6000 });
  });

  it('escala con la distancia', () => {
    expect(estimateFuel(125, 8, 1500)).toEqual({
      liters: 10,
      costArs: 15000,
    });
  });
});

describe('parseConsumption', () => {
  it.each([
    ['8', 8],
    ['7.5', 7.5],
    [' 9 ', 9],
    [6, 6],
  ])('acepta %p', (raw, expected) => {
    expect(parseConsumption(raw)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    '',
    '   ',
    'abc',
    '0',
    '-3',
    0,
    -1,
    NaN,
    'Infinity',
  ])('rechaza %p', (raw) => {
    expect(parseConsumption(raw)).toBeNull();
  });
});

describe('roundTo', () => {
  it('redondea a dos decimales', () => {
    expect(roundTo(4.00000001)).toBe(4);
    expect(roundTo(1234.5678)).toBe(1234.57);
  });
});
