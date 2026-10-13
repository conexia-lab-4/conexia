import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

// Reglas para sumar a un usuario como pasajero, compartidas por "unirse"
// manualmente y por aceptar un match. Se ejecuta dentro de una transacción.
export async function addPassenger(
  tx: Prisma.TransactionClient,
  tripId: string,
  userId: string,
) {
  const trip = await tx.trip.findUnique({
    where: { id: tripId },
    include: { passengers: true },
  });

  if (!trip) {
    throw new NotFoundException('El viaje no existe');
  }

  if (trip.driverId === userId) {
    throw new ForbiddenException(
      'El conductor no puede sumarse a su propio viaje como pasajero',
    );
  }

  if (trip.passengers.some((passenger) => passenger.userId === userId)) {
    throw new ConflictException('Ya participás de este viaje');
  }

  if (trip.passengers.length >= trip.capacity) {
    throw new ConflictException('No quedan lugares disponibles');
  }

  const overlapping = await tx.trip.findFirst({
    where: {
      id: { not: tripId },
      departureTime: { lt: trip.arrivalTime },
      arrivalTime: { gt: trip.departureTime },
      OR: [{ driverId: userId }, { passengers: { some: { userId } } }],
    },
  });

  if (overlapping) {
    throw new ConflictException(
      'El viaje se solapa con otro viaje en el que participás',
    );
  }

  return tx.tripPassenger.create({ data: { tripId, userId } });
}

export function isSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  );
}
