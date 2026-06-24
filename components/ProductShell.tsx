"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
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
  | "apartments"
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
      {
        href: "/apartments",
        label: { zh: "好公寓", en: "Top Apts" },
        description: {
          zh: "洛杉矶精选公寓推荐",
          en: "Curated LA apartments",
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
      className="inline-flex h-10 shrink-0 border border-[var(--black)] bg-white/60"
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
                    background:
                      option === "zh" ? "var(--cardinal)" : "var(--gold)",
                    color: option === "zh" ? "white" : "var(--black)",
                  }
                : { color: "var(--mid)" }
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
  const { language, setLanguage } = useLanguage();
  const copy = PRODUCT_SHELL_COPY[language];

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
                    {navGroup.label[language]}
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
                              {item.label[language]}
                            </span>
                            <span className="mt-1 block text-xs text-[var(--mid)]">
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

          <label className="flex h-10 shrink-0 items-center gap-2 border border-[rgba(26,20,16,0.16)] bg-white/60 px-3">
            <span className="font-display text-[10px] tracking-[0.1em] text-[var(--mid)]">
              {copy.school}
            </span>
            <select
              value={school}
              onChange={(event) =>
                setSchool(event.target.value as ProductSchool)
              }
              className="bg-transparent text-sm font-bold text-[var(--black)] outline-none"
              aria-label={copy.chooseSchool}
            >
              {SCHOOL_OPTIONS.map((option) => (
                <option key={option} value={option}>
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
                className="border border-[var(--black)] px-3 py-2 font-display text-[10px] tracking-wider hover:bg-[var(--cardinal)] hover:text-white"
                style={
                  pathname.startsWith("/admin")
                    ? { background: "var(--cardinal)", color: "white" }
                    : { color: "var(--black)" }
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
                    className="border border-[var(--black)] px-3 py-2 font-display text-[10px] tracking-wider hover:bg-[var(--gold)]"
                    style={
                      pathname === "/account"
                        ? { background: "var(--gold)", color: "var(--black)" }
                        : { color: "var(--black)" }
                    }
                  >
                    {copy.account}
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="border border-[var(--black)] px-3 py-2 font-display text-[10px] tracking-wider text-[var(--black)] hover:bg-[var(--cardinal)] hover:text-white"
                  >
                    {copy.signOut}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuth(true)}
                  className="border border-[var(--black)] px-3 py-2 font-display text-[10px] tracking-wider text-[var(--black)] hover:bg-[var(--cardinal)] hover:text-white"
                >
                  {copy.signIn}
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
                  className="border border-[var(--black)] px-3 py-2 font-display text-[10px] tracking-wider"
                >
                  {copy.account}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuth(true)}
                  className="border border-[var(--black)] px-3 py-2 font-display text-[10px] tracking-wider"
                >
                  {copy.signIn}
                </button>
              ))}
          </div>
        </div>
      </header>

      <main>{children({ school, setSchool, language, setLanguage })}</main>

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
              {navGroup.label[language]}
            </Link>
          );
        })}
      </nav>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        language={language}
      />
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
}: ProductTaskHeaderProps) {
  const copy = PRODUCT_SHELL_COPY[language];
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
              {copy.currentSchool} {school}
            </span>
            <span className="border border-[rgba(26,20,16,0.18)] bg-[var(--beige)] px-3 py-1.5 text-xs font-bold text-[var(--mid)]">
              {copy.switchSchool}
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
