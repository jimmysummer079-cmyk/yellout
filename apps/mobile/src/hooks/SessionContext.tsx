import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AnonymousSession } from '@yellout/shared';
import {
  type ColdStartPhase,
  ensureSession,
  pingHealth,
  refreshCodename,
} from '@/lib/api';
import { isOnboardingDone, markOnboardingDone } from '@/lib/storage';

interface SessionContextValue {
  ready: boolean;
  phase: ColdStartPhase;
  phaseDetail: string;
  error: string | null;
  session: AnonymousSession | null;
  onboardingDone: boolean;
  completeOnboarding: () => Promise<void>;
  refreshName: () => Promise<string>;
  setCodename: (c: string) => void;
  retryBoot: () => void;
  crisisOpen: boolean;
  crisisForced: boolean;
  openCrisis: (forced?: boolean) => void;
  closeCrisis: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<ColdStartPhase>('idle');
  const [phaseDetail, setPhaseDetail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<AnonymousSession | null>(null);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [bootKey, setBootKey] = useState(0);
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [crisisForced, setCrisisForced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReady(false);
      setError(null);
      setPhase('idle');
      try {
        const done = await isOnboardingDone();
        if (!cancelled) setOnboardingDone(done);

        const cold = {
          onPhase: (p: ColdStartPhase, detail?: string) => {
            if (cancelled) return;
            setPhase(p);
            if (detail) setPhaseDetail(detail);
          },
        };
        await pingHealth(cold);
        const s = await ensureSession(cold);
        if (!cancelled) {
          setSession(s);
          setPhase('ready');
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '无法连接服务器');
          setPhase('error');
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootKey]);

  const completeOnboarding = useCallback(async () => {
    await markOnboardingDone();
    setOnboardingDone(true);
  }, []);

  const refreshName = useCallback(async () => {
    const next = await refreshCodename();
    setSession((prev) => (prev ? { ...prev, codename: next } : prev));
    return next;
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      ready,
      phase,
      phaseDetail,
      error,
      session,
      onboardingDone,
      completeOnboarding,
      refreshName,
      setCodename: (c) => setSession((prev) => (prev ? { ...prev, codename: c } : prev)),
      retryBoot: () => setBootKey((k) => k + 1),
      crisisOpen,
      crisisForced,
      openCrisis: (forced = false) => {
        setCrisisForced(forced);
        setCrisisOpen(true);
      },
      closeCrisis: () => {
        setCrisisOpen(false);
        setCrisisForced(false);
      },
    }),
    [
      ready,
      phase,
      phaseDetail,
      error,
      session,
      onboardingDone,
      completeOnboarding,
      refreshName,
      crisisOpen,
      crisisForced,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession outside provider');
  return ctx;
}
