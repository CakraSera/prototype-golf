import { ApiError, type AuthUser, type LoginInput, type RegisterInput } from '@golf/shared';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { api } from '../../services/api';
import * as tokenStore from './token-store';

type SessionState = {
  status: 'loading' | 'signedOut' | 'signedIn' | 'error';
  user: AuthUser | null;
  accessToken: string | null;
  error: string | null;
};

type Session = SessionState & {
  signIn(input: LoginInput): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  signOut(): Promise<void>;
  restore(): Promise<void>;
};

const emptySession = { user: null, accessToken: null, error: null };
const SessionContext = createContext<Session | null>(null);

export class AccountCreatedError extends Error {
  constructor(reason: string) {
    super(`Your account was created, but sign-in did not finish. ${reason} Sign in with your new account; do not register again.`);
    this.name = 'AccountCreatedError';
  }
}

function requestMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ ...emptySession, status: 'loading' });
  const revision = useRef(0);
  const mustDelete = useRef(false);
  const storageQueue = useRef<Promise<void>>(Promise.resolve());

  // Preserve write order if logout overlaps an in-flight secure-store write.
  const updateStorage = useCallback((update: () => Promise<void>) => {
    const next = storageQueue.current.then(update, update);
    storageQueue.current = next;
    return next;
  }, []);

  const deleteCredentials = useCallback(async (current: number) => {
    mustDelete.current = true;
    try {
      await updateStorage(tokenStore.removeToken);
    } catch {
      const message = 'Could not remove your saved sign-in. Your private screens are locked. Retry to finish logging out.';
      if (revision.current === current) {
        setState({ ...emptySession, status: 'error', error: message });
      }
      throw new Error(message);
    }
    if (revision.current === current) {
      mustDelete.current = false;
      setState({ ...emptySession, status: 'signedOut' });
    }
  }, [updateStorage]);

  const signOut = useCallback(async () => {
    const current = ++revision.current;
    // Unmount all private routes before waiting on native storage.
    setState({ ...emptySession, status: 'loading' });
    await deleteCredentials(current);
  }, [deleteCredentials]);

  const restore = useCallback(async () => {
    const current = ++revision.current;
    setState({ ...emptySession, status: 'loading' });
    if (mustDelete.current) {
      try {
        await deleteCredentials(current);
      } catch {
        // deleteCredentials exposes the actionable storage error in session state.
      }
      return;
    }

    let token: string | null = null;
    try {
      await storageQueue.current.catch(() => undefined);
      token = await tokenStore.getToken();
      if (revision.current !== current) return;
      if (!token) {
        setState({ ...emptySession, status: 'signedOut' });
        return;
      }
      const user = await api.me(token);
      if (revision.current === current) {
        setState({ status: 'signedIn', user, accessToken: token, error: null });
      }
    } catch (error) {
      if (revision.current !== current) return;
      if (error instanceof ApiError && error.status === 401) {
        try {
          await deleteCredentials(current);
        } catch {
          // Keep routes locked until deletion succeeds, rather than restoring an expired token.
        }
        return;
      }
      setState({
        ...emptySession,
        status: 'error',
        accessToken: token,
        error: requestMessage(error, 'Could not restore your session. Check your connection and retry. Your saved sign-in has not been removed.'),
      });
    }
  }, [deleteCredentials]);

  const authenticate = useCallback(async (input: LoginInput, current: number) => {
    setState({ ...emptySession, status: 'signedOut' });
    try {
      const result = await api.login(input);
      if (revision.current !== current) return;
      try {
        await updateStorage(() => tokenStore.setToken(result.accessToken));
      } catch {
        throw new Error('Could not securely save your session. Please try signing in again.');
      }
      if (revision.current === current) {
        mustDelete.current = false;
        setState({ status: 'signedIn', user: result.user, accessToken: result.accessToken, error: null });
      }
    } catch (error) {
      const message = error instanceof Error && !(error instanceof TypeError)
        ? error.message
        : 'Could not sign in. Check your connection and try again.';
      if (revision.current === current) {
        setState({ ...emptySession, status: 'signedOut', error: message });
      }
      throw new Error(message);
    }
  }, [updateStorage]);

  const signIn = useCallback((input: LoginInput) => {
    return authenticate(input, ++revision.current);
  }, [authenticate]);

  const register = useCallback(async (input: RegisterInput) => {
    const current = ++revision.current;
    try {
      await api.register(input);
    } catch (error) {
      if (revision.current !== current) return;
      throw new Error(requestMessage(error, 'Could not create your account. Check your connection and try again.'));
    }
    if (revision.current !== current) return;
    try {
      await authenticate({ email: input.email, password: input.password }, current);
    } catch (error) {
      if (revision.current !== current) return;
      throw new AccountCreatedError(error instanceof Error ? error.message : 'Please try signing in.');
    }
  }, [authenticate]);

  useEffect(() => {
    void restore();
    return () => {
      revision.current += 1;
    };
  }, [restore]);

  const value = useMemo(() => ({ ...state, signIn, register, signOut, restore }), [state, signIn, register, signOut, restore]);
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): Session {
  const session = use(SessionContext);
  if (!session) throw new Error('useSession must be used inside SessionProvider');
  return session;
}
