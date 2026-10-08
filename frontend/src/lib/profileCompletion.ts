import type { ProfileResponse } from './profileApi';

export function getProfileCompletion(profile: ProfileResponse | null): number {
  if (!profile) return 0;

  const checks = [
    Boolean(profile.university),
    Boolean(profile.career),
    profile.year != null,
    Boolean(profile.campus),
    Boolean(profile.originAddress),
    Boolean(profile.phone),
    Boolean(profile.birthDate),
    Boolean(profile.bio),
    profile.hasCar !== null,
  ];

  if (profile.hasCar) {
    checks.push(
      Boolean(profile.carModel),
      Boolean(profile.carColor),
      profile.availableSeats != null,
    );
  }

  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}
