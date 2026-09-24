import { FirebaseError } from 'firebase/app';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'El formato del email no es válido.',
  'auth/user-disabled': 'Esta cuenta fue deshabilitada.',
  'auth/user-not-found': 'No encontramos una cuenta con ese email.',
  'auth/wrong-password': 'La contraseña es incorrecta.',
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/password-does-not-meet-requirements':
    'La contraseña no cumple los requisitos de seguridad (mínimo 8 caracteres, mayúscula, minúscula y carácter especial).',
  'auth/too-many-requests': 'Demasiados intentos. Probá de nuevo más tarde.',
  'auth/network-request-failed':
    'Error de conexión. Revisá tu internet e intentá de nuevo.',
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }
  return 'Ocurrió un error inesperado. Intentá de nuevo.';
}
