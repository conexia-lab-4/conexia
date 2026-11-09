import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from './authContext';
import { forgetPushToken } from '../lib/pushNotifications';

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setStatus(firebaseUser ? 'authed' : 'unauthed');
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      logout: async () => {
        // El dispositivo deja de recibir los avisos de esta cuenta
        await forgetPushToken();
        await signOut(auth);
        navigate('/login', { replace: true });
      },
    }),
    [user, status, navigate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
