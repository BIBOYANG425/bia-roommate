"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSchoolEmail } from "@/lib/auth";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import AuthModal from "./AuthModal";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signUp: async () => ({ error: "Not initialized" }),
  signIn: async () => ({ error: "Not initialized" }),
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReauth, setShowReauth] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        const hadUser = user !== null;
        setUser(session?.user ?? null);
        if (event === "SIGNED_OUT" && hadUser) {
          setShowReauth(true);
        }
        if (event === "SIGNED_IN") {
          setShowReauth(false);
        }
      },
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isSchoolEmail(email)) {
      return {
        error:
          "Please use a school email (.usc.edu, .berkeley.edu, or .stanford.edu)",
      };
    }
    if (password.length < 6) {
      return { error: "Password must be at least 6 characters" };
    }

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSchoolEmail(email)) {
      return {
        error:
          "Please sign in with your school email (.usc.edu, .berkeley.edu, or .stanford.edu)",
      };
    }
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
      <AuthModal
        isOpen={showReauth}
        onClose={() => setShowReauth(false)}
        title="SESSION EXPIRED"
        subtitle="Please sign in again to continue"
      />
    </AuthContext.Provider>
  );
}
