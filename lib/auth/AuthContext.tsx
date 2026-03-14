"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "./supabase-browser";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const sb = getSupabaseBrowser();

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [sb]);

  const signOut = useCallback(async () => {
    await sb.auth.signOut();
    window.location.href = "/login";
  }, [sb]);

  return <Ctx.Provider value={{ user, session, loading, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
