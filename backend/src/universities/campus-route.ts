import { BadRequestException } from '@nestjs/common';
import { RouteDirection } from '../../generated/prisma/client';
import type { Coordinates } from '../geo/geo.service';
import type { PrismaService } from '../prisma/prisma.service';

export interface RouteEnd {
  label: string;
  coords: Coordinates;
}

// La sede y la casa de un recorrido. Con ellas se arma cualquiera de los dos
// sentidos: la ida y la vuelta de un paquete comparten la misma
export interface CampusRoute {
  campusId: string;
  campusEnd: RouteEnd;
  homeEnd: RouteEnd;
}

// Sentido y horarios de un tramo
export interface RouteLeg {
  routeDirection: RouteDirection;
  departureTime: Date;
  arrivalTime: Date;
}

// Solo se geocodifica la dirección de la casa; el extremo de la universidad
// usa las coordenadas de la sede. La casa es el origen en la ida y el destino
// en la vuelta
export async function resolveCampusRoute(
  prisma: PrismaService,
  dto: {
    campusId: string;
    routeDirection: RouteDirection;
    origin: string;
    destination: string;
  },
  geocodeOrThrow: (address: string) => Promise<Coordinates>,
): Promise<CampusRoute> {
  const campusEnd = await loadCampusEnd(prisma, dto.campusId);
  const homeAddress =
    dto.routeDirection === RouteDirection.TO_CAMPUS
      ? dto.origin
      : dto.destination;

  return {
    campusId: dto.campusId,
    campusEnd,
    homeEnd: { label: homeAddress, coords: await geocodeOrThrow(homeAddress) },
  };
}

// Los campos de origen, destino y sentido de un tramo
export function legRouteData(route: CampusRoute, leg: RouteLeg) {
  const { origin, destination } = placeRouteEnds(
    leg.routeDirection,
    route.campusEnd,
    route.homeEnd,
  );

  return {
    origin: origin.label,
    originLat: origin.coords.lat,
    originLng: origin.coords.lng,
    destination: destination.label,
    destinationLat: destination.coords.lat,
    destinationLng: destination.coords.lng,
    campusId: route.campusId,
    routeDirection: leg.routeDirection,
    departureTime: leg.departureTime,
    arrivalTime: leg.arrivalTime,
  };
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
