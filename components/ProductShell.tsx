"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import {
  type ProductSchool,
  resolveInitialProductSchool,
  writeStoredProductSchool,
} from "@/lib/product-school";
import { SCHOOL_OPTIONS } from "@/lib/types";

export type ProductGroup = "housing" | "courses" | "services" | "community";

export type ProductPage =
  | "roommates"
  | "sublet"
  | "course-planner"
  | "course-rating"
  | "shipping"
  | "squad"
  | "usc-group";

type ProductNavItem = {
  href: string;
  label: string;
  description: string;
};

type ProductNavGroup = {
  id: ProductGroup;
  label: string;
  href: string;
  items: ProductNavItem[];
};

type ProductShellContext = {
  school: ProductSchool;
  setSchool: (school: ProductSchool) => void;
};

type ProductShellProps = {
  group: ProductGroup;
  page: ProductPage;
  children: (ctx: ProductShellContext) => ReactNode;
};

type ProductTaskHeaderAction = {
  label: string;
  href: string;
};

type ProductTaskHeaderProps = {
  eyebrow: string;
  school: ProductSchool;
  title: string;
  description: string;
  primaryAction: ProductTaskHeaderAction;
  secondaryAction: ProductTaskHeaderAction;
  trustItems: string[];
};

const PRODUCT_NAV_GROUPS: ProductNavGroup[] = [
  {
    id: "housing",
    label: "Housing",
    href: "/roommates",
    items: [
      {
        href: "/roommates",
        label: "找室友",
        description: "Roommate profiles by school",
      },
      {
        href: "/sublet",
        label: "转租",
        description: "Apartments and sublets",
      },
    ],
  },
  {
    id: "courses",
    label: "Courses",
    href: "/course-planner",
    items: [
      {
        href: "/course-planner",
        label: "选课规划",
        description: "Plan schedules",
      },
      {
        href: "/course-rating",
        label: "课评",
        description: "Student course reviews",
      },
    ],
  },
  {
    id: "services",
    label: "Services",
    href: "/shipping",
    items: [
      {
        href: "/shipping",
        label: "集运",
        description: "Shipping and parcels",
      },
      {
        href: "/squad",
        label: "找搭子",
        description: "Campus companions",
      },
    ],
  },
  {
    id: "community",
    label: "Community",
    href: "/usc-group",
    items: [
      {
        href: "/usc-group",
        label: "新生群",
        description: "School communities",
      },
      {
        href: "/join",
        label: "加入 BIA",
        description: "Events and membership",
      },
    ],
  },
];

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

export default function ProductShell({
  group,
  children,
}: ProductShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading, isAdmin, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [openGroup, setOpenGroup] = useState<ProductGroup | null>(null);
  const [school, setSchoolState] = useState<ProductSchool>(() =>
    resolveInitialProductSchool(searchParams.get("school")),
  );

  function setSchool(nextSchool: ProductSchool) {
    setSchoolState(nextSchool);
    writeStoredProductSchool(nextSchool);
  }

  return (
    <div
      className="min-h-screen pb-20 lg:pb-0"
      style={{ background: "var(--beige)" }}
    >
      <header className="sticky top-0 z-40 hidden border-b border-[rgba(26,20,16,0.16)] bg-[rgba(250,246,236,0.94)] backdrop-blur lg:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 transition-opacity hover:opacity-75"
          >
            <Image
              src="/logo.png"
              alt="BIA"
              width={28}
              height={28}
              className="object-contain"
              style={{ height: "auto" }}
            />
            <span className="font-display text-base tracking-[0.08em] text-[var(--black)]">
              BIA
            </span>
          </Link>

          <nav className="flex min-w-0 flex-1 items-center justify-center gap-1">
            {PRODUCT_NAV_GROUPS.map((navGroup) => {
              const active = group === navGroup.id;
              const open = openGroup === navGroup.id;
              return (
                <div
                  key={navGroup.id}
                  className="relative"
                >
                  <button
                    type="button"
                    onClick={() => setOpenGroup(open ? null : navGroup.id)}
                    onFocus={() => setOpenGroup(navGroup.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setOpenGroup(null);
                    }}
                    className="h-10 rounded-md border px-4 font-display text-[12px] tracking-[0.08em] transition-colors"
                    style={
                      active
                        ? {
                            background: "var(--cardinal)",
                            borderColor: "var(--cardinal)",
                            color: "white",
                          }
                        : {
                            background: "rgba(255,255,255,0.52)",
                            borderColor: "rgba(26,20,16,0.14)",
                            color: "var(--mid)",
                          }
                    }
                    aria-expanded={open}
                  >
                    {navGroup.label}
                  </button>

                  {open && (
                    <div className="absolute left-1/2 top-12 w-72 -translate-x-1/2 border border-[rgba(26,20,16,0.14)] bg-[var(--cream)] p-2 shadow-[8px_8px_0_rgba(26,20,16,0.12)]">
                      {navGroup.items.map((item) => {
                        const itemActive = isActivePath(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpenGroup(null)}
                            className="block border-b border-[rgba(26,20,16,0.1)] px-3 py-3 last:border-b-0 hover:bg-white"
                            style={
                              itemActive
                                ? { color: "var(--cardinal)" }
                                : { color: "var(--black)" }
                            }
                          >
                            <span className="block font-display text-sm tracking-[0.08em]">
                              {item.label}
                            </span>
                            <span className="mt-1 block text-xs text-[var(--mid)]">
                              {item.description}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <label className="flex h-10 shrink-0 items-center gap-2 border border-[rgba(26,20,16,0.16)] bg-white/60 px-3">
            <span className="font-display text-[10px] tracking-[0.1em] text-[var(--mid)]">
              School
            </span>
            <select
              value={school}
              onChange={(event) =>
                setSchool(event.target.value as ProductSchool)
              }
              className="bg-transparent text-sm font-bold text-[var(--black)] outline-none"
              aria-label="Choose school"
            >
              {SCHOOL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="border border-[var(--black)] px-3 py-2 font-display text-[10px] tracking-wider hover:bg-[var(--cardinal)] hover:text-white"
                style={
                  pathname.startsWith("/admin")
                    ? { background: "var(--cardinal)", color: "white" }
                    : { color: "var(--black)" }
                }
              >
                ADMIN
              </Link>
            )}
            {!loading &&
              (user ? (
                <>
                  <Link
                    href="/account"
                    className="border border-[var(--black)] px-3 py-2 font-display text-[10px] tracking-wider hover:bg-[var(--gold)]"
                    style={
                      pathname === "/account"
                        ? { background: "var(--gold)", color: "var(--black)" }
                        : { color: "var(--black)" }
                    }
                  >
                    ACCOUNT
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="border border-[var(--black)] px-3 py-2 font-display text-[10px] tracking-wider text-[var(--black)] hover:bg-[var(--cardinal)] hover:text-white"
                  >
                    SIGN OUT
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuth(true)}
                  className="border border-[var(--black)] px-3 py-2 font-display text-[10px] tracking-wider text-[var(--black)] hover:bg-[var(--cardinal)] hover:text-white"
                >
                  SIGN IN
                </button>
              ))}
          </div>
        </div>
      </header>

      <header className="sticky top-0 z-40 border-b border-[rgba(26,20,16,0.16)] bg-[rgba(250,246,236,0.96)] backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="BIA"
              width={26}
              height={26}
              className="object-contain"
              style={{ height: "auto" }}
            />
            <span className="font-display text-sm tracking-[0.08em] text-[var(--black)]">
              BIA
            </span>
          </Link>
          {!loading &&
            (user ? (
              <Link
                href="/account"
                className="border border-[var(--black)] px-3 py-2 font-display text-[10px] tracking-wider"
              >
                ACCOUNT
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuth(true)}
                className="border border-[var(--black)] px-3 py-2 font-display text-[10px] tracking-wider"
              >
                SIGN IN
              </button>
            ))}
        </div>
      </header>

      <main>{children({ school, setSchool })}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 border-t border-[rgba(26,20,16,0.18)] bg-[rgba(250,246,236,0.96)] backdrop-blur lg:hidden">
        {PRODUCT_NAV_GROUPS.map((navGroup) => {
          const active = group === navGroup.id;
          return (
            <Link
              key={navGroup.id}
              href={navGroup.href}
              className="flex items-center justify-center border-r border-[rgba(26,20,16,0.12)] px-1 text-center font-display text-[10px] tracking-[0.06em] last:border-r-0"
              style={
                active
                  ? { color: "var(--cardinal)" }
                  : { color: "var(--mid)" }
              }
            >
              {navGroup.label}
            </Link>
          );
        })}
      </nav>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}

export function ProductTaskHeader({
  eyebrow,
  school,
  title,
  description,
  primaryAction,
  secondaryAction,
  trustItems,
}: ProductTaskHeaderProps) {
  return (
    <section
      className="border-b-[3px] border-[var(--black)]"
      style={{ background: "var(--cream)" }}
    >
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <p className="font-display text-xs tracking-[0.16em] text-[var(--mid)]">
            {eyebrow}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="border border-[var(--black)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--black)]">
              当前学校 {school}
            </span>
            <span className="border border-[rgba(26,20,16,0.18)] bg-[var(--beige)] px-3 py-1.5 text-xs font-bold text-[var(--mid)]">
              ALL schools available
            </span>
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-[42px] leading-[0.95] text-[var(--black)] sm:text-[64px]">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--mid)] sm:text-base">
            {description}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {trustItems.map((item) => (
              <li
                key={item}
                className="border border-[rgba(26,20,16,0.18)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--mid)]"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link
            href={primaryAction.href}
            className="inline-flex min-h-11 items-center justify-center border-[3px] border-[var(--black)] bg-[var(--cardinal)] px-5 font-display text-sm tracking-[0.08em] text-white transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
          >
            {primaryAction.label}
          </Link>
          <Link
            href={secondaryAction.href}
            className="inline-flex min-h-11 items-center justify-center border-[3px] border-[var(--black)] bg-[var(--gold)] px-5 font-display text-sm tracking-[0.08em] text-[var(--black)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
          >
            {secondaryAction.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
