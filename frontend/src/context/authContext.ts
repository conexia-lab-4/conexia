import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';

export type AuthStatus = 'loading' | 'authed' | 'unauthed';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
