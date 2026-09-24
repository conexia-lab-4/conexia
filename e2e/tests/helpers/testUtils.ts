const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:3000';

async function post(path: string, email: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(
      `POST ${path} respondió ${response.status}. ¿El backend tiene E2E_TESTING=true?`,
    );
  }
}

export function verifyEmail(email: string) {
  return post('/test-utils/verify-email', email);
}

export function resetProfile(email: string) {
  return post('/test-utils/reset-profile', email);
}

export function deleteTestUser(email: string) {
  return post('/test-utils/delete-user', email);
}
