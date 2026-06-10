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
export type ProductLanguage = "zh" | "en";

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
  label: Record<ProductLanguage, string>;
  description: Record<ProductLanguage, string>;
};

type ProductNavGroup = {
  id: ProductGroup;
  label: Record<ProductLanguage, string>;
  href: string;
  items: ProductNavItem[];
};

type ProductShellContext = {
  school: ProductSchool;
  setSchool: (school: ProductSchool) => void;
  language: ProductLanguage;
  setLanguage: (language: ProductLanguage) => void;
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
  language: ProductLanguage;
  title: string;
  description: string;
  primaryAction: ProductTaskHeaderAction;
  secondaryAction: ProductTaskHeaderAction;
  trustItems: string[];
  previewImage: string;
  previewAlt: string;
};

const PRODUCT_NAV_GROUPS: ProductNavGroup[] = [
  {
    id: "housing",
    label: { zh: "住房", en: "Housing" },
    href: "/roommates",
    items: [
      {
        href: "/roommates",
        label: { zh: "找室友", en: "Roommates" },
        description: {
          zh: "按学校浏览室友资料",
          en: "Roommate profiles by school",
        },
      },
      {
        href: "/sublet",
        label: { zh: "转租", en: "Sublets" },
        description: {
          zh: "公寓和短期转租",
          en: "Apartments and sublets",
        },
      },
    ],
  },
  {
    id: "courses",
    label: { zh: "选课", en: "Courses" },
    href: "/course-planner",
    items: [
      {
        href: "/course-planner",
        label: { zh: "选课规划", en: "Course Planner" },
        description: { zh: "规划课表", en: "Plan schedules" },
      },
      {
        href: "/course-rating",
        label: { zh: "课评", en: "Course Reviews" },
        description: {
          zh: "学生课评参考",
          en: "Student course reviews",
        },
      },
    ],
  },
  {
    id: "services",
    label: { zh: "服务", en: "Services" },
    href: "/shipping",
    items: [
      {
        href: "/shipping",
        label: { zh: "集运", en: "Shipping" },
        description: { zh: "包裹和物流服务", en: "Shipping and parcels" },
      },
      {
        href: "/squad",
        label: { zh: "找搭子", en: "Squad" },
        description: { zh: "校园搭子和活动伙伴", en: "Campus companions" },
      },
    ],
  },
  {
    id: "community",
    label: { zh: "社群", en: "Community" },
    href: "/usc-group",
    items: [
      {
        href: "/usc-group",
        label: { zh: "新生群", en: "Freshman Groups" },
        description: { zh: "学校社群入口", en: "School communities" },
      },
      {
        href: "/join",
        label: { zh: "加入 BIA", en: "Join BIA" },
        description: { zh: "活动和会员服务", en: "Events and membership" },
      },
    ],
  },
];

const PRODUCT_LANGUAGE_STORAGE_KEY = "bia-product-language";

const PRODUCT_SHELL_COPY: Record<
  ProductLanguage,
  {
    school: string;
    chooseSchool: string;
    signIn: string;
    account: string;
    signOut: string;
    admin: string;
    language: string;
    currentSchool: string;
    switchSchool: string;
  }
> = {
  zh: {
    school: "学校",
    chooseSchool: "选择学校",
    signIn: "登录",
    account: "账号",
    signOut: "退出",
    admin: "管理",
    language: "语言",
    currentSchool: "当前学校",
    switchSchool: "右上角可切换学校",
  },
  en: {
    school: "School",
    chooseSchool: "Choose school",
    signIn: "Sign in",
    account: "Account",
    signOut: "Sign out",
    admin: "Admin",
    language: "Language",
    currentSchool: "Current school",
    switchSchool: "Switch schools in the top bar",
  },
};

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

function resolveInitialProductLanguage(): ProductLanguage {
  if (typeof window === "undefined") return "zh";
  try {
    const stored = window.localStorage.getItem(PRODUCT_LANGUAGE_STORAGE_KEY);
    return stored === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

function writeStoredProductLanguage(language: ProductLanguage) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRODUCT_LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage can fail in private mode or restricted browser contexts.
  }
}

function LanguageToggle({
  language,
  setLanguage,
  compact = false,
}: {
  language: ProductLanguage;
  setLanguage: (language: ProductLanguage) => void;
  compact?: boolean;
}) {
  return (
    <div
      className="inline-flex h-10 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/10 text-white shadow-sm"
      aria-label={PRODUCT_SHELL_COPY[language].language}
    >
      {(["zh", "en"] as const).map((option) => {
        const active = option === language;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLanguage(option)}
            aria-pressed={active}
            className="px-3 font-display text-[10px] tracking-[0.08em] transition-colors"
            style={
              active
                ? {
                    background: "rgba(255,255,255,0.92)",
                    color: "#171717",
                  }
                : { color: "rgba(255,255,255,0.72)" }
            }
          >
            {option === "zh" ? (compact ? "中" : "中文") : "EN"}
          </button>
        );
      })}
    </div>
  );
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
  const [language, setLanguageState] = useState<ProductLanguage>(
    resolveInitialProductLanguage,
  );
  const copy = PRODUCT_SHELL_COPY[language];

  function setSchool(nextSchool: ProductSchool) {
    setSchoolState(nextSchool);
    writeStoredProductSchool(nextSchool);
  }

  function setLanguage(nextLanguage: ProductLanguage) {
    setLanguageState(nextLanguage);
    writeStoredProductLanguage(nextLanguage);
  }

  return (
    <div
      className="min-h-screen pb-20 lg:pb-0"
      style={{ background: "var(--bg-primary)" }}
    >
      <header className="fixed left-0 right-0 top-5 z-40 hidden px-6 lg:block">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 rounded-2xl border border-white/15 bg-[rgba(31,31,41,0.72)] px-5 text-white shadow-2xl backdrop-blur-xl">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 transition-opacity hover:opacity-80"
          >
            <Image
              src="/logo.png"
              alt="BIA"
              width={28}
              height={28}
              className="object-contain"
              style={{ height: "auto" }}
            />
            <span className="heading-serif text-xl tracking-tight text-white">
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
                    className="h-10 rounded-xl border px-4 text-sm font-medium transition-colors"
                    style={
                      active
                        ? {
                            background: "rgba(255,255,255,0.92)",
                            borderColor: "rgba(255,255,255,0.92)",
                            color: "#171717",
                          }
                        : {
                            background: "transparent",
                            borderColor: "transparent",
                            color: "rgba(255,255,255,0.72)",
                          }
                    }
                    aria-expanded={open}
                  >
                    {navGroup.label[language]}
                  </button>

                  {open && (
                    <div className="absolute left-1/2 top-12 w-72 -translate-x-1/2 overflow-hidden rounded-2xl border border-black/5 bg-white/95 p-2 text-[#171717] shadow-xl backdrop-blur">
                      {navGroup.items.map((item) => {
                        const itemActive = isActivePath(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpenGroup(null)}
                            className="block rounded-xl px-3 py-3 transition-colors hover:bg-[#F9FAF7]"
                            style={
                              itemActive
                                ? { color: "#71031f" }
                                : { color: "#171717" }
                            }
                          >
                            <span
                              className="block text-sm font-semibold"
                              style={{
                                fontFamily:
                                  language === "zh"
                                    ? "var(--font-display-zh)"
                                    : "var(--font-body)",
                              }}
                            >
                              {item.label[language]}
                            </span>
                            <span className="mt-1 block text-xs text-[#646464]">
                              {item.description[language]}
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

          <label className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3">
            <span className="font-display text-[10px] tracking-[0.1em] text-white/60">
              {copy.school}
            </span>
            <select
              value={school}
              onChange={(event) =>
                setSchool(event.target.value as ProductSchool)
              }
              className="bg-transparent text-sm font-bold text-white outline-none"
              aria-label={copy.chooseSchool}
            >
              {SCHOOL_OPTIONS.map((option) => (
                <option key={option} value={option} className="text-[#171717]">
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle language={language} setLanguage={setLanguage} />

            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-full border border-white/20 px-3 py-2 font-display text-[10px] tracking-wider text-white/80 hover:bg-white/10 hover:text-white"
                style={
                  pathname.startsWith("/admin")
                    ? { background: "rgba(255,255,255,0.18)", color: "white" }
                    : undefined
                }
              >
                {copy.admin}
              </Link>
            )}
            {!loading &&
              (user ? (
                <>
                  <Link
                    href="/account"
                    className="rounded-full border border-white/20 px-3 py-2 font-display text-[10px] tracking-wider text-white/80 hover:bg-white/10 hover:text-white"
                    style={
                      pathname === "/account"
                        ? { background: "rgba(255,255,255,0.18)", color: "white" }
                        : undefined
                    }
                  >
                    {copy.account}
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="rounded-full border border-white/20 px-3 py-2 font-display text-[10px] tracking-wider text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    {copy.signOut}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuth(true)}
                  className="rounded-full bg-white/90 px-4 py-2 font-display text-[10px] tracking-wider text-[#171717] shadow-sm hover:bg-white"
                >
                  {copy.signIn}
                </button>
              ))}
          </div>
        </div>
      </header>

      <header className="fixed left-0 right-0 top-3 z-40 px-3 lg:hidden">
        <div className="flex h-14 items-center justify-between rounded-2xl border border-white/15 bg-[rgba(31,31,41,0.78)] px-4 text-white shadow-xl backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="BIA"
              width={26}
              height={26}
              className="object-contain"
              style={{ height: "auto" }}
            />
            <span className="heading-serif text-lg tracking-tight text-white">
              BIA
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle
              language={language}
              setLanguage={setLanguage}
              compact
            />
            {!loading &&
              (user ? (
                <Link
                  href="/account"
                  className="rounded-full border border-white/20 px-3 py-2 font-display text-[10px] tracking-wider text-white/80"
                >
                  {copy.account}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuth(true)}
                  className="rounded-full bg-white/90 px-3 py-2 font-display text-[10px] tracking-wider text-[#171717]"
                >
                  {copy.signIn}
                </button>
              ))}
          </div>
        </div>
      </header>

      <main className="pt-20 lg:pt-24">
        {children({ school, setSchool, language, setLanguage })}
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid h-14 grid-cols-4 overflow-hidden rounded-2xl border border-black/5 bg-white/90 shadow-xl backdrop-blur lg:hidden">
        {PRODUCT_NAV_GROUPS.map((navGroup) => {
          const active = group === navGroup.id;
          return (
            <Link
              key={navGroup.id}
              href={navGroup.href}
              className="flex items-center justify-center border-r border-black/5 px-1 text-center text-[11px] font-semibold last:border-r-0"
              style={
                active
                  ? { color: "#71031f" }
                  : { color: "#646464" }
              }
            >
              {navGroup.label[language]}
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
  language,
  title,
  description,
  primaryAction,
  secondaryAction,
  trustItems,
  previewImage,
  previewAlt,
}: ProductTaskHeaderProps) {
  const copy = PRODUCT_SHELL_COPY[language];
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#999]">
            {eyebrow}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#171717] shadow-sm">
              {copy.currentSchool} {school}
            </span>
            <span className="rounded-full border border-black/5 bg-[#eef6f4] px-3.5 py-1.5 text-xs font-semibold text-[#55736f]">
              {copy.switchSchool}
            </span>
          </div>
          <h1
            className="heading-serif mt-6 max-w-3xl text-[48px] leading-[0.96] text-[#171717] sm:text-[72px]"
            style={{
              fontFamily:
                language === "zh"
                  ? "var(--font-display-zh)"
                  : "var(--font-display)",
            }}
          >
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#646464] sm:text-lg">
            {description}
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {trustItems.map((item) => (
              <li
                key={item}
                className="rounded-full border border-black/5 bg-white/80 px-3 py-1.5 text-xs font-medium text-[#646464] shadow-sm"
              >
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={primaryAction.href}
              className="group inline-flex min-h-12 items-center justify-center rounded-xl bg-[#171717] px-6 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition-all duration-200 hover:bg-[#2C2C2C]"
            >
              {primaryAction.label}
              <span className="ml-2 transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              href={secondaryAction.href}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-black/10 bg-white px-6 text-sm font-semibold text-[#171717] shadow-sm transition-all duration-200 hover:border-black/20 hover:shadow-md"
            >
              {secondaryAction.label}
            </Link>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="absolute -inset-6 rounded-[2rem] bg-[#A0D7D1]/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-3xl border border-black/5 bg-white shadow-2xl">
            <Image
              src={previewImage}
              alt={previewAlt}
              width={900}
              height={650}
              className="aspect-[4/3] w-full object-cover object-top"
              priority
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/85 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
