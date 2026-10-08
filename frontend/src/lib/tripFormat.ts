const pad = (n: number) => n.toString().padStart(2, '0');

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "mié." → "Mié"
export function formatWeekdayShort(iso: string): string {
  const weekday = new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'short',
  });
  return capitalize(weekday.replace('.', ''));
}

export function formatDayNumber(iso: string): string {
  return pad(new Date(iso).getDate());
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// "Miércoles 27/08 · 14:00"
export function formatTripDateTime(iso: string): string {
  const date = new Date(iso);
  const weekday = date.toLocaleDateString('es-AR', { weekday: 'long' });
  return `${capitalize(weekday)} ${pad(date.getDate())}/${pad(date.getMonth() + 1)} · ${formatTime(iso)}`;
}

export function formatSeats(seats: number): string {
  return `${seats} ${seats === 1 ? 'asiento' : 'asientos'}`;
}

// El backend todavía no guarda el nombre: se arma desde el email
// ("juan.martinez@uni.edu.ar" → "Juan Martinez")
export function getDisplayName(email: string): string {
  const [localPart] = email.split('@');
  const name = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map(capitalize)
    .join(' ');
  return name || email;
}

export function getInitials(email: string): string {
  return getDisplayName(email)
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}
