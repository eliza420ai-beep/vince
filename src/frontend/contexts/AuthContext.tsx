import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  clearInviteCode,
  getStoredInviteCode,
  isGatedAccessAllowed,
  setInviteCode as persistInviteCode,
} from "../lib/auth";

interface AuthContextValue {
  isAuthenticated: boolean;
  setInviteCode: (code: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState(isGatedAccessAllowed);

  const setInviteCode = useCallback((code: string) => {
    persistInviteCode(code);
    setAllowed(isGatedAccessAllowed());
  }, []);

  const signOut = useCallback(() => {
    clearInviteCode();
    setAllowed(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: allowed,
      setInviteCode,
      signOut,
    }),
    [allowed, setInviteCode, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
