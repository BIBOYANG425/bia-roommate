"use client";

// Admin dashboard chrome — header bar + left sidebar nav (collapses to top
// tabs on mobile). Wraps every page under /admin/*. Renders nothing until
// isAdmin is confirmed; non-admins get a forbidden screen.

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  ADMIN_SECTIONS,
  ADMIN_GROUPS,
  type AdminSection,
} from "@/lib/admin/sections";

export default function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [bootLoading, setBootLoading] = useState(true);

  // isAdmin is threaded through AuthProvider (fires /api/admin/me once the
  // user is set). We wait a tick to avoid flashing the forbidden screen
  // while that call is in flight.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setBootLoading(false);
      return;
    }
    // Give AuthProvider one turn to resolve isAdmin; after that, trust it.
    const t = setTimeout(() => setBootLoading(false), 200);
    return () => clearTimeout(t);
  }, [authLoading, user]);

  if (authLoading || bootLoading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--cream)" }}
      >
        <p
          className="font-display text-2xl tracking-[0.2em]"
          style={{ color: "var(--mid)" }}
        >
          LOADING...
        </p>
      </main>
    );
  }

  if (!user || !isAdmin) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-6"
        style={{ background: "var(--cream)" }}
      >
        <p
          className="font-display text-3xl"
          style={{ color: "var(--cardinal)" }}
        >
          需要管理员权限
        </p>
        <p className="text-xs" style={{ color: "var(--mid)" }}>
          你的账号 ({user?.email ?? "未登录"}) 不在 ADMIN_EMAILS 名单里。
        </p>
        <Link
          href="/"
          className="brutal-btn brutal-btn-primary inline-block"
        >
          ← 返回首页
        </Link>
      </main>
    );
  }

  const groups: Record<string, AdminSection[]> = {};
  for (const section of ADMIN_SECTIONS) {
    (groups[section.group] ??= []).push(section);
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Top header */}
      <header
        className="border-b-[3px] border-[var(--black)]"
        style={{ background: "var(--black)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link
            href="/admin"
            className="font-display text-lg tracking-[0.2em] text-white hover:opacity-80"
          >
            BIA · ADMIN
          </Link>
          <div className="flex items-center gap-3 text-[11px] text-white/70">
            <span className="hidden sm:inline">{user.email}</span>
            <Link href="/" className="hover:text-white">
              ← 返回站点
            </Link>
            <button
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              className="hover:text-white"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-6">
        {/* Sidebar (desktop) / top tabs (mobile) */}
        <aside className="sm:w-56 shrink-0">
          <nav className="flex sm:flex-col gap-0 sm:gap-1 overflow-x-auto">
            {Object.entries(groups).map(([group, items]) => (
              <div key={group} className="sm:block flex shrink-0 sm:w-auto">
                <p
                  className="hidden sm:block font-display text-[10px] tracking-[0.2em] mt-3 mb-1 px-2"
                  style={{ color: "var(--mid)" }}
                >
                  {ADMIN_GROUPS[group as AdminSection["group"]]}
                </p>
                <div className="flex sm:block">
                  {items.map((s) => {
                    const active = pathname === s.href;
                    return (
                      <Link
                        key={s.href}
                        href={s.href}
                        className="font-display text-xs tracking-wider px-3 py-2 border-[3px] border-[var(--black)] -mr-[3px] sm:mr-0 sm:-mb-[3px] sm:block whitespace-nowrap transition-colors"
                        style={{
                          background: active
                            ? "var(--cardinal)"
                            : "var(--cream)",
                          color: active ? "white" : "var(--black)",
                        }}
                      >
                        <span className="mr-1">{s.icon}</span>
                        {s.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <section className="flex-1 min-w-0">{children}</section>
      </div>
    </main>
  );
}
