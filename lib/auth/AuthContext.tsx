"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearAuth,
  readAuth,
  writeAuth,
  type AuthSession,
} from "./storage";

type AuthContextValue = {
  token: string | null;
  username: string | null;
  ready: boolean;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = readAuth();
    if (session) {
      setToken(session.token);
      setUsername(session.username);
    }
    setReady(true);
  }, []);

  const setSession = useCallback((session: AuthSession) => {
    writeAuth(session);
    setToken(session.token);
    setUsername(session.username);
  }, []);

  const clearSession = useCallback(() => {
    clearAuth();
    setToken(null);
    setUsername(null);
  }, []);

  const value = useMemo(
    () => ({ token, username, ready, setSession, clearSession }),
    [token, username, ready, setSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
