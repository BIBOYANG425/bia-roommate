"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import AuthModal from "./AuthModal";

const TABS = [
  { href: "/roommates", label: "找室友" },
  { href: "/sublet", label: "转租" },
  { href: "/squad", label: "找搭子" },
  { href: "/course-planner", label: "选课" },
  { href: "/course-rating", label: "课评" },
  { href: "/usc-group", label: "USC 新生群" },
];

export default function NavTabs() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <nav
        className="border-b-[3px] border-[var(--black)] flex items-center overflow-x-auto"
        style={{ background: "var(--cream)" }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 px-4 sm:px-6 py-2 border-r-[3px] border-[var(--black)] shrink-0 hover:opacity-80 transition-opacity"
          style={{ background: "var(--cream)" }}
        >
          <Image src="/logo.png" alt="BIA" width={24} height={24} className="object-contain" style={{ height: "auto" }} />
          <span className="font-display text-sm sm:text-base tracking-[0.1em]" style={{ color: "var(--black)" }}>BIA</span>
        </Link>

        {TABS.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href !== "/" && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="font-display text-sm sm:text-base tracking-[0.1em] px-5 sm:px-8 py-3 border-r-[3px] border-[var(--black)] transition-colors shrink-0 whitespace-nowrap"
              style={
                active
                  ? { background: "var(--cardinal)", color: "white" }
                  : { background: "var(--cream)", color: "var(--mid)" }
              }
            >
              {tab.label}
            </Link>
          );
        })}

        {/* Auth indicator — right side */}
        <div className="ml-auto px-4 flex items-center gap-2 sm:gap-3">
          {!loading &&
            (user ? (
              <>
                <Link
                  href="/account"
                  className="font-display text-[11px] tracking-wider px-3 py-1 border-[2px] border-[var(--black)] transition-colors hover:bg-[var(--gold)]"
                  style={
                    pathname === "/account"
                      ? { background: "var(--gold)", color: "var(--black)" }
                      : { color: "var(--black)" }
                  }
                >
                  ACCOUNT
                </Link>
                <button
                  onClick={signOut}
                  className="font-display text-[11px] tracking-wider px-3 py-1 border-[2px] border-[var(--black)] transition-colors hover:bg-[var(--cardinal)] hover:text-white"
                  style={{ color: "var(--black)" }}
                >
                  SIGN OUT
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="font-display text-[11px] tracking-wider px-3 py-1 border-[2px] border-[var(--black)] transition-colors hover:bg-[var(--cardinal)] hover:text-white"
                style={{ color: "var(--black)" }}
              >
                SIGN IN
              </button>
            ))}
        </div>
      </nav>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
