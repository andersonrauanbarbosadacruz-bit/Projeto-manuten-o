import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  User,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth, googleProvider, testConnection } from '../firebase';

export type FirebaseAuthErrorKind = 'ANONYMOUS_DISABLED' | 'AUTH_ERROR' | null;

interface FirebaseContextType {
  firebaseUser: User | null;
  isAuthReady: boolean;
  isAuthenticated: boolean;
  authError: FirebaseAuthErrorKind;
  authErrorMessage: string | null;
  isConnectionOffline: boolean;
  retryAnonymousAuth: () => Promise<void>;
  signInAdminWithGoogle: () => Promise<void>;
  signOutFirebase: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [authError, setAuthError] = useState<FirebaseAuthErrorKind>(null);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [isConnectionOffline, setIsConnectionOffline] = useState<boolean>(false);
  const anonAttemptedRef = useRef<boolean>(false);

  const performAnonymousSignIn = useCallback(async () => {
    try {
      setAuthError(null);
      setAuthErrorMessage(null);
      const cred = await signInAnonymously(auth);
      setFirebaseUser(cred.user);
      setIsAuthReady(true);
    } catch (err: any) {
      const code = String(err?.code || '');
      const msg = String(err?.message || '');
      if (
        code === 'auth/operation-not-allowed' ||
        code === 'auth/admin-restricted-operation' ||
        msg.includes('OPERATION_NOT_ALLOWED') ||
        msg.includes('ADMIN_ONLY_OPERATION')
      ) {
        setAuthError('ANONYMOUS_DISABLED');
        setAuthErrorMessage(
          'Ative o login Anônimo no Console do Firebase (Authentication > Sign-in method > Anônimo) para sincronizar sem exigir login Gmail.'
        );
      } else {
        setAuthError('AUTH_ERROR');
        setAuthErrorMessage(msg || 'Falha na autenticação Firebase.');
      }
      setIsAuthReady(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!mounted) return;
      if (user) {
        setFirebaseUser(user);
        setAuthError(null);
        setAuthErrorMessage(null);
        setIsAuthReady(true);
        // Validate Firestore connectivity once authenticated
        testConnection().then((res) => {
          if (mounted && res.offline) {
            setIsConnectionOffline(true);
          } else if (mounted) {
            setIsConnectionOffline(false);
          }
        });
      } else if (!anonAttemptedRef.current) {
        anonAttemptedRef.current = true;
        performAnonymousSignIn();
      } else {
        setFirebaseUser(null);
        setIsAuthReady(true);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [performAnonymousSignIn]);

  const retryAnonymousAuth = useCallback(async () => {
    await performAnonymousSignIn();
  }, [performAnonymousSignIn]);

  const signInAdminWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(auth, googleProvider);
    setFirebaseUser(result.user);
    setAuthError(null);
    setAuthErrorMessage(null);
  }, []);

  const signOutFirebase = useCallback(async () => {
    await signOut(auth);
    await performAnonymousSignIn();
  }, [performAnonymousSignIn]);

  return (
    <FirebaseContext.Provider
      value={{
        firebaseUser,
        isAuthReady,
        isAuthenticated: Boolean(firebaseUser),
        authError,
        authErrorMessage,
        isConnectionOffline,
        retryAnonymousAuth,
        signInAdminWithGoogle,
        signOutFirebase
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return ctx;
};
