import { NotFoundException } from '@nestjs/common';
import {
  jointScore,
  pickMatch,
  RoundTripMatchesService,
  type MatchCandidate,
} from './round-trip-matches.service';
import { PrismaService } from '../prisma/prisma.service';
import { DisplayNamesService } from '../firebase/display-names.service';

describe('RoundTripMatchesService', () => {
  let service: RoundTripMatchesService;
  let prismaMock: {
    trip: { findMany: jest.Mock };
    travelIntent: { findMany: jest.Mock };
  };
  let displayNamesMock: { getPublicUsers: jest.Mock };

  const userId = 'user-123';
  const now = new Date('2026-10-01T12:00:00.000Z');
  const future = (hour: number) =>
    new Date(`2026-10-05T${String(hour).padStart(2, '0')}:00:00.000Z`);
  const past = new Date('2026-09-30T08:00:00.000Z');

  const intentLeg = (overrides: Record<string, unknown> = {}) => ({
    id: 'intent-ida',
    roundTripId: 'paquete-1',
    routeDirection: 'TO_CAMPUS',
    origin: 'Los Cardales',
    destination: 'Universidad Austral - Sede Pilar',
    departureTime: future(8),
    arrivalTime: future(9),
    status: 'ACTIVE',
    travelMatches: [],
    ...overrides,
  });

  const intentMatch = (
    id: string,
    score: number,
    status: string,
    driverId: string,
    departureTime = future(8),
  ) => ({
    id,
    score,
    status,
    tripId: `trip-${id}`,
    travelIntentId: 'intent',
    trip: {
      driverId,
      departureTime,
      driver: { studentProfile: { carModel: 'Polo', carColor: 'Negro' } },
    },
  });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    prismaMock = {
      trip: { findMany: jest.fn().mockResolvedValue([]) },
      travelIntent: { findMany: jest.fn().mockResolvedValue([]) },
    };
    displayNamesMock = {
      getPublicUsers: jest.fn().mockResolvedValue(
        new Map([
          ['conductor-1', { displayName: 'Ana', photoUrl: 'https://foto/ana' }],
          ['conductor-2', { displayName: 'Beto', photoUrl: null }],
          ['pasajero-1', { displayName: 'Caro', photoUrl: null }],
        ]),
      ),
    };
    service = new RoundTripMatchesService(
      prismaMock as unknown as PrismaService,
      displayNamesMock as unknown as DisplayNamesService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('jointScore', () => {
    it('promedia los dos tramos: 90 y 70 dan 80', () => {
      expect(
        jointScore([{ match: { score: 90 } }, { match: { score: 70 } }]),
      ).toBe(80);
    });

    it('es null si a un tramo le falta coincidencia o falta un tramo', () => {
      expect(
        jointScore([{ match: { score: 90 } }, { match: null }]),
      ).toBeNull();
      expect(jointScore([{ match: { score: 90 } }])).toBeNull();
    });
  });

  describe('pickMatch', () => {
    const candidate = (
      id: string,
      score: number,
      status: string,
      hour = 8,
    ): MatchCandidate =>
      ({
        id,
        score,
        status,
        tripId: 't',
        travelIntentId: 'i',
        departureTime: future(hour),
        personId: 'p',
      }) as MatchCandidate;

    it('prefiere el aceptado aunque haya sugerencias con más puntaje', () => {
      expect(
        pickMatch([
          candidate('a', 95, 'SUGGESTED'),
          candidate('b', 70, 'ACCEPTED'),
        ])?.id,
      ).toBe('b');
    });

    it('elige la mejor sugerencia y, a igualdad, la que sale antes', () => {
      expect(
        pickMatch([
          candidate('a', 70, 'SUGGESTED'),
          candidate('b', 85, 'SUGGESTED', 10),
          candidate('c', 85, 'SUGGESTED', 8),
        ])?.id,
      ).toBe('c');
    });

    it('devuelve null sin candidatos', () => {
      expect(pickMatch([])).toBeNull();
    });
  });

  describe('findForPackage', () => {
    it('agrupa un tramo confirmado y otro con propuesta, con personas distintas', async () => {
      prismaMock.travelIntent.findMany.mockResolvedValue([
        intentLeg({
          status: 'FULFILLED',
          travelMatches: [intentMatch('m1', 90, 'ACCEPTED', 'conductor-1')],
        }),
        intentLeg({
          id: 'intent-vuelta',
          routeDirection: 'FROM_CAMPUS',
          departureTime: future(18),
          arrivalTime: future(19),
          travelMatches: [
            intentMatch('m2', 65, 'SUGGESTED', 'conductor-1', future(18)),
            intentMatch('m3', 70, 'SUGGESTED', 'conductor-2', future(18)),
          ],
        }),
      ]);

      const result = await service.findForPackage('paquete-1', userId);

      expect(prismaMock.travelIntent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, roundTripId: 'paquete-1' },
        }),
      );
      expect(result.kind).toBe('INTENT');
      expect(result.jointScore).toBe(80);
      expect(result.legs).toMatchObject([
        {
          routeDirection: 'TO_CAMPUS',
          travelIntentId: 'intent-ida',
          tripId: null,
          status: 'CONFIRMED',
          match: {
            id: 'm1',
            score: 90,
            status: 'ACCEPTED',
            person: {
              id: 'conductor-1',
              displayName: 'Ana',
              photoUrl: 'https://foto/ana',
              carModel: 'Polo',
              carColor: 'Negro',
            },
          },
        },
        {
          routeDirection: 'FROM_CAMPUS',
          status: 'PROPOSED',
          match: { id: 'm3', score: 70, person: { id: 'conductor-2' } },
        },
      ]);
    });

    it('con un solo tramo con coincidencia deja el otro pendiente y sin porcentaje', async () => {
      prismaMock.travelIntent.findMany.mockResolvedValue([
        intentLeg({
          travelMatches: [intentMatch('m1', 90, 'SUGGESTED', 'conductor-1')],
        }),
        intentLeg({ id: 'intent-vuelta', routeDirection: 'FROM_CAMPUS' }),
      ]);

      const result = await service.findForPackage('paquete-1', userId);

      expect(result.jointScore).toBeNull();
      expect(result.legs.map((leg) => leg.status)).toEqual([
        'PROPOSED',
        'PENDING',
      ]);
      expect(result.legs[0].match?.score).toBe(90);
    });

    it('cierra el tramo cancelado o vencido y no muestra sugerencias de viajes salidos', async () => {
      prismaMock.travelIntent.findMany.mockResolvedValue([
        intentLeg({
          status: 'CANCELLED',
          travelMatches: [intentMatch('m1', 90, 'SUGGESTED', 'conductor-1')],
        }),
        intentLeg({
          id: 'intent-vuelta',
          routeDirection: 'FROM_CAMPUS',
          travelMatches: [
            intentMatch('m2', 90, 'SUGGESTED', 'conductor-1', past),
          ],
        }),
      ]);

      const result = await service.findForPackage('paquete-1', userId);

      expect(result.legs.map((leg) => [leg.status, leg.match])).toEqual([
        ['CLOSED', null],
        ['PENDING', null],
      ]);
      expect(result.jointScore).toBeNull();
    });

    it('para quien publica viajes muestra pasajeros y cuántos confirmó', async () => {
      const tripLeg = (overrides: Record<string, unknown>) => ({
        id: 'trip-ida',
        roundTripId: 'paquete-1',
        routeDirection: 'TO_CAMPUS',
        origin: 'Los Cardales',
        destination: 'Universidad Austral - Sede Pilar',
        departureTime: future(8),
        arrivalTime: future(9),
        _count: { passengers: 0 },
        travelMatches: [],
        ...overrides,
      });
      prismaMock.trip.findMany.mockResolvedValue([
        tripLeg({
          _count: { passengers: 1 },
          travelMatches: [
            {
              id: 'm1',
              score: 75,
              status: 'ACCEPTED',
              tripId: 'trip-ida',
              travelIntentId: 'intent-x',
              travelIntent: { userId: 'pasajero-1', departureTime: future(8) },
            },
          ],
        }),
        tripLeg({
          id: 'trip-vuelta',
          routeDirection: 'FROM_CAMPUS',
          departureTime: future(18),
          arrivalTime: future(19),
        }),
      ]);

      const result = await service.findForPackage('paquete-1', userId);

      expect(prismaMock.trip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { driverId: userId, roundTripId: 'paquete-1' },
        }),
      );
      expect(result.kind).toBe('TRIP');
      expect(result.legs[0]).toMatchObject({
        tripId: 'trip-ida',
        travelIntentId: null,
        status: 'CONFIRMED',
        confirmedPassengers: 1,
        match: {
          id: 'm1',
          person: { id: 'pasajero-1', displayName: 'Caro', photoUrl: null },
        },
      });
      expect(result.legs[0].match?.person).not.toHaveProperty('carModel');
      expect(result.legs[1]).toMatchObject({
        status: 'PENDING',
        match: null,
      });
      expect(result.jointScore).toBeNull();
    });

    it('responde 404 si el paquete no existe o es de otro usuario', async () => {
      await expect(service.findForPackage('paquete-1', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findMine', () => {
    it('devuelve los paquetes propios que todavía tienen un tramo por delante', async () => {
      prismaMock.travelIntent.findMany.mockResolvedValue([
        intentLeg({
          roundTripId: 'viejo',
          departureTime: past,
          arrivalTime: past,
        }),
        intentLeg({ roundTripId: 'nuevo' }),
      ]);

      const result = await service.findMine(userId);

      expect(prismaMock.travelIntent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, roundTripId: { not: null } },
        }),
      );
      expect(result.map((roundTrip) => roundTrip.id)).toEqual(['nuevo']);
    });
  });
});
