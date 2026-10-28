import { BadRequestException } from '@nestjs/common';
import { RouteDirection } from '../../generated/prisma/client';
import type { Coordinates } from '../geo/geo.service';
import type { PrismaService } from '../prisma/prisma.service';

export interface RouteEnd {
  label: string;
  coords: Coordinates;
}

// El extremo de la universidad sale siempre de la sede del catálogo
export async function loadCampusEnd(
  prisma: PrismaService,
  campusId: string,
): Promise<RouteEnd> {
  const campus = await prisma.campus.findUnique({
    where: { id: campusId },
    include: { university: true },
  });

  if (!campus) {
    throw new BadRequestException('La sede elegida no existe');
  }

  return {
    label: `${campus.university.name} - ${campus.name}`,
    coords: { lat: campus.latitude, lng: campus.longitude },
  };
}

// Ida: la universidad es el destino. Vuelta: la universidad es el origen
export function placeRouteEnds(
  direction: RouteDirection,
  campusEnd: RouteEnd,
  homeEnd: RouteEnd,
) {
  return direction === RouteDirection.TO_CAMPUS
    ? { origin: homeEnd, destination: campusEnd }
    : { origin: campusEnd, destination: homeEnd };
}
