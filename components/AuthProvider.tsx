"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSchoolEmail } from "@/lib/auth";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import AuthModal from "./AuthModal";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Open the sign-in modal; runs onSuccess once after a successful sign-in. */
  promptSignIn: (opts?: {
    title?: string;
    subtitle?: string;
    onSuccess?: () => void;
  }) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAdmin: false,
  signUp: async () => ({ error: "Not initialized" }),
  signIn: async () => ({ error: "Not initialized" }),
  signOut: async () => {},
  promptSignIn: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  // One modal serves both "session expired" and on-demand "sign in to do X".
  // pendingAction runs once after a successful sign-in (e.g. finish a like).
  const [authModal, setAuthModal] = useState<{
    open: boolean;
    title?: string;
    subtitle?: string;
  }>({ open: false });
  const pendingAction = useRef<(() => void) | null>(null);

  const promptSignIn = useCallback(
    (opts?: { title?: string; subtitle?: string; onSuccess?: () => void }) => {
      pendingAction.current = opts?.onSuccess ?? null;
      setAuthModal({
        open: true,
        title: opts?.title,
        subtitle: opts?.subtitle,
      });
    },
    [],
  );

  const closeAuthModal = useCallback(() => {
    pendingAction.current = null;
    setAuthModal((m) => ({ ...m, open: false }));
  }, []);

  // Fetch admin flag whenever the user changes. Cheap endpoint; ADMIN_EMAILS
  // is server-only so we can't compute this client-side.
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { isAdmin: boolean };
      if (!cancelled) setIsAdmin(data.isAdmin);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
          setAuthModal({
            open: true,
            title: "SESSION EXPIRED",
            subtitle: "Please sign in again to continue",
          });
        }
        if (event === "SIGNED_IN") {
          setAuthModal((m) => ({ ...m, open: false }));
          const action = pendingAction.current;
          pendingAction.current = null;
          if (action) setTimeout(action, 0);
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
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        signUp,
        signIn,
        signOut,
        promptSignIn,
      }}
    >
      {children}
      <AuthModal
        isOpen={authModal.open}
        onClose={closeAuthModal}
        title={authModal.title}
        subtitle={authModal.subtitle}
      />
    </AuthContext.Provider>
  );
}
