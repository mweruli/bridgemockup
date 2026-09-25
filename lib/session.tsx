"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchMe, type UserProfile } from "@/lib/api";

interface Session {
  accessToken: string;
  profile: UserProfile;
}

interface SessionContextValue {
  session: Session | null;
  loading: boolean;
  setSession: (session: Session) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const STORAGE_KEY = "bridgetalent.mockup.session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setLoading(false);
          return;
        }
        const { accessToken } = JSON.parse(raw) as { accessToken: string };
        const profile = await fetchMe(accessToken);
        if (!cancelled) setSessionState({ accessToken, profile });
      } catch {
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  function setSession(next: Session) {
    setSessionState(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken: next.accessToken }));
    } catch {
      // Private-window / blocked storage — session still works for this
      // page load, just won't survive a refresh. Fine for a mockup.
    }
  }

  function clearSession() {
    setSessionState(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <SessionContext.Provider value={{ session, loading, setSession, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
