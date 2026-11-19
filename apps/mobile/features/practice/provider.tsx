import { ApiError, type Completion, type DrillMatch, type Shot } from '@golf/shared';
import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { useSession } from '../auth/session';
import { api } from '../../services/api';

export type Draft = Partial<Shot>;
type Stage = 'report' | 'recommendation' | 'practice' | 'unmatched';
type PracticeState = {
  draft: Draft;
  stage: Stage;
  match: DrillMatch | null;
  attempt: string | null;
  pending: 'match' | 'save' | null;
  error: string | null;
};
type PracticeContextValue = PracticeState & {
  history: Completion[] | null;
  historyPending: boolean;
  historyError: string | null;
  saved: boolean;
  setDraft: (draft: Draft) => void;
  findDrill: () => Promise<void>;
  start: () => void;
  back: () => void;
  save: () => Promise<void>;
  newReport: () => void;
  loadHistory: () => Promise<void>;
};
const initial: PracticeState = { draft: {}, stage: 'report', match: null, attempt: null, pending: null, error: null };
const Context = createContext<PracticeContextValue | null>(null);

export function PracticeProvider({ children }: { children: ReactNode }) {
  const { status, user, accessToken, signOut } = useSession();
  if (status !== 'signedIn' || !user || !accessToken) return null;
  return <PracticeSession key={`${user.id}:${accessToken}`} token={accessToken} signOut={signOut}>{children}</PracticeSession>;
}

function PracticeSession({ token, signOut, children }: { token: string; signOut: () => Promise<void>; children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<PracticeState>(initial);
  const current = useRef(state);
  const [history, setHistory] = useState<Completion[] | null>(null);
  const [historyPending, setHistoryPending] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const alive = useRef(true);
  const action = useRef<AbortController | null>(null);
  const historyRequest = useRef<AbortController | null>(null);
  const update = (next: PracticeState) => { current.current = next; setState(next); };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      action.current?.abort();
      historyRequest.current?.abort();
      action.current = null;
      historyRequest.current = null;
    };
  }, []);

  const failure = useCallback((error: unknown): string | null => {
    if (error instanceof ApiError && error.status === 401) {
      // SessionGate displays storage failures while keeping private routes locked.
      void signOut().catch(() => undefined);
      return null;
    }
    return error instanceof Error ? error.message : 'Could not connect. Please try again.';
  }, [signOut]);

  const fetchHistory = useCallback(async (replace = false) => {
    if (historyRequest.current && !replace) return;
    historyRequest.current?.abort();
    const request = new AbortController();
    historyRequest.current = request;
    setHistoryPending(true);
    setHistoryError(null);
    try {
      const entries = await api.listCompletions(token, request.signal);
      if (!alive.current || request.signal.aborted || historyRequest.current !== request) return;
      setHistory([...entries].sort((a, b) => b.completedAt.localeCompare(a.completedAt) || b.id.localeCompare(a.id)));
    } catch (error) {
      if (!alive.current || request.signal.aborted || historyRequest.current !== request) return;
      setHistoryError(failure(error));
    } finally {
      if (alive.current && historyRequest.current === request) {
        historyRequest.current = null;
        setHistoryPending(false);
      }
    }
  }, [token, failure]);
  const loadHistory = useCallback(() => fetchHistory(), [fetchHistory]);

  const setDraft = (draft: Draft) => {
    if (current.current.pending === 'save') return;
    action.current?.abort();
    action.current = null;
    setSaved(false);
    update({ ...initial, draft });
  };
  const findDrill = async () => {
    const snapshot = current.current;
    const { start, curve, height } = snapshot.draft;
    if (snapshot.pending || !start || !curve || !height) return;
    const request = new AbortController();
    action.current = request;
    update({ ...snapshot, pending: 'match', error: null });
    try {
      const match = await api.matchShot(token, { start, curve, height }, request.signal);
      if (!alive.current || request.signal.aborted || action.current !== request) return;
      update({ ...snapshot, match, attempt: null, stage: match ? 'recommendation' : 'unmatched', pending: null, error: null });
    } catch (error) {
      if (!alive.current || request.signal.aborted || action.current !== request) return;
      update({ ...snapshot, pending: null, error: failure(error) });
    } finally {
      if (action.current === request) action.current = null;
    }
  };
  const start = () => {
    const snapshot = current.current;
    if (snapshot.stage !== 'recommendation' || !snapshot.match || snapshot.pending) return;
    try {
      update({ ...snapshot, stage: 'practice', attempt: randomUUID(), error: null });
    } catch {
      update({ ...snapshot, error: 'Could not start practice. Please try again.' });
    }
  };
  const back = () => {
    const snapshot = current.current;
    if (snapshot.pending === 'save') return;
    action.current?.abort();
    action.current = null;
    update({ ...snapshot, stage: snapshot.stage === 'practice' ? 'recommendation' : 'report', attempt: null, pending: null, error: null });
  };
  const save = async () => {
    const snapshot = current.current;
    if (snapshot.pending || snapshot.stage !== 'practice' || !snapshot.match || !snapshot.attempt) return;
    const request = new AbortController();
    action.current = request;
    update({ ...snapshot, pending: 'save', error: null });
    try {
      await api.completePractice(token, { id: snapshot.attempt, ruleId: snapshot.match.ruleId }, request.signal);
      if (!alive.current || request.signal.aborted || action.current !== request) return;
      update({ ...initial, draft: snapshot.draft });
      setSaved(true);
      // Only a server acknowledgement permits success or navigation. Replace an older history request.
      void fetchHistory(true);
      router.navigate('/progress');
    } catch (error) {
      if (!alive.current || request.signal.aborted || action.current !== request) return;
      update({ ...snapshot, pending: null, error: failure(error) });
    } finally {
      if (action.current === request) action.current = null;
    }
  };
  const newReport = () => {
    if (current.current.pending === 'save') return;
    setDraft({});
    router.navigate('/');
  };

  return <Context.Provider value={{ ...state, history, historyPending, historyError, saved, setDraft, findDrill, start, back, save, newReport, loadHistory }}>{children}</Context.Provider>;
}

export function usePractice() {
  const value = useContext(Context);
  if (!value) throw new Error('Practice screens require PracticeProvider');
  return value;
}
