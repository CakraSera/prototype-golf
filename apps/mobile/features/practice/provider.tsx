import { ApiError, type Completion, type DrillCheckIn, type DrillMatch, type Shot } from '@golf/shared';
import { randomUUID } from 'expo-crypto';
import { usePathname, useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useSession } from '../auth/session';
import { api } from '../../services/api';
import { progressFromCompletions, type PracticeProgress } from './progress';

export type Draft = Partial<Shot>;
export type CheckInDraft = Omit<DrillCheckIn, 'utcOffsetMinutes'>;
type Stage = 'report' | 'recommendation' | 'practice' | 'unmatched';
type PracticeState = {
  draft: Draft;
  stage: Stage;
  match: DrillMatch | null;
  attempt: string | null;
  checkIn: CheckInDraft;
  pending: 'match' | 'save' | null;
  error: string | null;
};
type PracticeContextValue = PracticeState & {
  history: Completion[] | null;
  historyPending: boolean;
  historyError: string | null;
  progress: PracticeProgress | null;
  savedId: string | null;
  achievementJump: boolean;
  openAchievements: () => void;
  consumeAchievementJump: () => void;
  setDraft: (draft: Draft) => void;
  findDrill: () => Promise<void>;
  start: () => void;
  repeatLast: () => void;
  updateCheckIn: (change: Partial<CheckInDraft>) => void;
  back: () => void;
  save: () => Promise<void>;
  newReport: () => void;
  loadHistory: () => Promise<void>;
};
const initial: PracticeState = { draft: {}, stage: 'report', match: null, attempt: null, checkIn: {}, pending: null, error: null };
const Context = createContext<PracticeContextValue | null>(null);

export function PracticeProvider({ children }: { children: ReactNode }) {
  const { status, user, accessToken, signOut } = useSession();
  if (status !== 'signedIn' || !user || !accessToken) return null;
  return <PracticeSession key={`${user.id}:${accessToken}`} token={accessToken} signOut={signOut}>{children}</PracticeSession>;
}

function PracticeSession({ token, signOut, children }: { token: string; signOut: () => Promise<void>; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = useRef(pathname);
  currentPath.current = pathname;
  const [state, setState] = useState<PracticeState>(initial);
  const current = useRef(state);
  const [history, setHistory] = useState<Completion[] | null>(null);
  const [historyPending, setHistoryPending] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [achievementJump, setAchievementJump] = useState(false);
  const progress = useMemo(() => history === null ? null : progressFromCompletions(history), [history]);
  const consumeAchievementJump = useCallback(() => setAchievementJump(false), []);
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
      setHistory(entries);
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
    setSavedId(null);
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
  const repeatLast = () => {
    const latest = history?.[0];
    if (!latest || current.current.stage !== 'report' || current.current.pending) return;
    setSavedId(null);
    update({ ...initial, draft: latest.match.shot, match: latest.match, stage: 'recommendation' });
  };
  const updateCheckIn = (change: Partial<CheckInDraft>) => {
    const snapshot = current.current;
    if (snapshot.pending || (snapshot.stage !== 'recommendation' && snapshot.stage !== 'practice')) return;
    update({ ...snapshot, checkIn: { ...snapshot.checkIn, ...change } });
  };
  const back = () => {
    const snapshot = current.current;
    if (snapshot.pending === 'save') return;
    action.current?.abort();
    action.current = null;
    update({
      ...snapshot,
      stage: snapshot.stage === 'practice' ? 'recommendation' : 'report',
      checkIn: snapshot.stage === 'practice' ? { confidenceBefore: snapshot.checkIn.confidenceBefore } : {},
      attempt: null,
      pending: null,
      error: null,
    });
  };
  const save = async () => {
    const snapshot = current.current;
    if (snapshot.pending || snapshot.stage !== 'practice' || !snapshot.match || !snapshot.attempt) return;
    const request = new AbortController();
    action.current = request;
    update({ ...snapshot, pending: 'save', error: null });
    try {
      const checkIn = Object.values(snapshot.checkIn).some(value => value !== undefined)
        ? { ...snapshot.checkIn, utcOffsetMinutes: -new Date().getTimezoneOffset() }
        : undefined;
      const completion = await api.completePractice(token, {
        id: snapshot.attempt, ruleId: snapshot.match.ruleId, checkIn,
      }, request.signal);
      if (!alive.current || request.signal.aborted || action.current !== request) return;
      update({ ...initial, draft: snapshot.draft });
      setSavedId(completion.id);
      // Refresh from the server so scoring uses its authoritative completion order.
      void fetchHistory(true);
      if (currentPath.current === '/') router.navigate('/progress');
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
  const openAchievements = () => {
    setAchievementJump(true);
    router.navigate('/progress');
  };

  return <Context.Provider value={{
    ...state, history, historyPending, historyError, progress, savedId, achievementJump, openAchievements, consumeAchievementJump,
    setDraft, findDrill, start, repeatLast, updateCheckIn, back, save, newReport, loadHistory,
  }}>{children}</Context.Provider>;
}

export function usePractice() {
  const value = useContext(Context);
  if (!value) throw new Error('Practice screens require PracticeProvider');
  return value;
}
