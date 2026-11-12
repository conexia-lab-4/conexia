import { toLocalDate } from './tripDates';

function formatTravelTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

// Tiempo entre la salida y la llegada de un tramo; undefined si todavía no hay
// horarios válidos
export function describeTravelTime(
  date: string,
  departureTime: string,
  arrivalTime: string,
): string | undefined {
  const diff =
    toLocalDate(date, arrivalTime).getTime() -
    toLocalDate(date, departureTime).getTime();
  const minutes = Math.round(diff / 60000);
  return Number.isFinite(minutes) && minutes > 0
    ? formatTravelTime(minutes)
    : undefined;
}
