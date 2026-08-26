import { auth } from './firebase';

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('No hay una sesión activa');
  }

  const idToken = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${idToken}`);

  return fetch(input, { ...init, headers });
}
