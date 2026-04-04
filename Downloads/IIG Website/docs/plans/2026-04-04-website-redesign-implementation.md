# IIG Website Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a custom Next.js website for Impact Investing Group at USC, replacing the current broken Squarespace site with a premium editorial design.

**Architecture:** Next.js 14 App Router with Tailwind CSS. Static pages with markdown-driven content for case studies and team data. Deployed on Vercel. No backend, no CMS admin, no auth.

**Tech Stack:** Next.js 14, Tailwind CSS, TypeScript, Playfair Display + Inter (Google Fonts), Formspree (contact form), Vercel (deploy)

**Design doc:** `docs/plans/2026-04-04-website-redesign-design.md`

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Step 1: Initialize Next.js project**

Run from the repo root (`/Users/mac/Downloads/IIG Website`):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This scaffolds into the current directory.

**Step 2: Configure Tailwind with brand tokens**

Replace `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#16165F",
          light: "#1E1E7A",
        },
        green: {
          DEFAULT: "#9BD97C",
          dark: "#7ABF5A",
        },
        cream: "#F8F7F4",
        "off-white": "#FAFAF8",
        text: {
          DEFAULT: "#1A1A2E",
          muted: "#6B6B80",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
```

**Step 3: Set up fonts in root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Impact Investing Group at USC",
  description:
    "Fund Ideas. Forge Futures. Fuel Social Change. USC's premier impact investing organization.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-cream font-sans text-text antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Step 4: Set up global styles**

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    scroll-behavior: smooth;
  }

  h1, h2, h3 {
    font-family: var(--font-playfair), serif;
  }
}
```

**Step 5: Create a placeholder homepage**

Replace `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="font-serif text-6xl font-bold text-navy">
        IIG is coming soon.
      </h1>
    </main>
  );
}
```

**Step 6: Verify it runs**

```bash
npm run dev
```

Open `http://localhost:3000`. Confirm: cream background, serif heading in navy, fonts loading.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with brand tokens and fonts"
```

---

### Task 2: Navbar Component

**Files:**
- Create: `src/components/navbar.tsx`
- Create: `src/components/mobile-menu.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Create the Navbar**

Create `src/components/navbar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import MobileMenu from "./mobile-menu";

const navItems = [
  { label: "Home", href: "/" },
  {
    label: "About",
    href: "/about",
    children: [
      { label: "About Us", href: "/about" },
      { label: "Team", href: "/about/team" },
      { label: "Services", href: "/about/services" },
      { label: "Values", href: "/about/values" },
    ],
  },
  { label: "Impact Palooza", href: "/impact-palooza" },
  { label: "Contact", href: "/contact" },
  {
    label: "Clients",
    href: "/clients",
    children: [
      { label: "Overview", href: "/clients" },
      { label: "Client FAQs", href: "/clients/faqs" },
      { label: "Case Studies", href: "/clients/case-studies" },
    ],
  },
  {
    label: "Apply",
    href: "/apply",
    children: [
      { label: "Why Join Us", href: "/apply" },
      { label: "FAQs", href: "/apply/faqs" },
    ],
  },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-navy/5 bg-cream/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="font-serif text-xl font-bold text-navy">
          Impact Investing Group
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <li key={item.label} className="group relative">
              <Link
                href={item.href}
                className="text-sm font-medium text-text transition-colors hover:text-navy"
              >
                {item.label}
              </Link>
              {item.children && (
                <ul className="invisible absolute left-0 top-full mt-2 min-w-[180px] rounded-lg border border-navy/5 bg-white p-2 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        className="block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-cream hover:text-navy"
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>

        {/* CTA + Mobile toggle */}
        <div className="flex items-center gap-4">
          <Link
            href="https://forms.gle/iT1fCQjJjf8H57JA7"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-green px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-green-dark"
          >
            Apply Now
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {mobileOpen && <MobileMenu items={navItems} onClose={() => setMobileOpen(false)} />}
    </header>
  );
}
```

**Step 2: Create the Mobile Menu**

Create `src/components/mobile-menu.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

export default function MobileMenu({
  items,
  onClose,
}: {
  items: NavItem[];
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="border-t border-navy/5 bg-cream px-6 py-4 lg:hidden">
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label}>
            {item.children ? (
              <>
                <button
                  onClick={() =>
                    setExpanded(expanded === item.label ? null : item.label)
                  }
                  className="flex w-full items-center justify-between py-2 text-sm font-medium text-text"
                >
                  {item.label}
                  <svg
                    className={`h-4 w-4 transition-transform ${expanded === item.label ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expanded === item.label && (
                  <ul className="ml-4 space-y-1">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={onClose}
                          className="block py-1.5 text-sm text-text-muted"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                onClick={onClose}
                className="block py-2 text-sm font-medium text-text"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Step 3: Add Navbar to layout**

Update `src/app/layout.tsx` — add `import Navbar from "@/components/navbar";` and wrap children:

```tsx
<body className="bg-cream font-sans text-text antialiased">
  <Navbar />
  {children}
</body>
```

**Step 4: Verify**

```bash
npm run dev
```

Confirm: sticky nav with dropdowns on hover, mobile hamburger at small viewports, green Apply Now CTA.

**Step 5: Commit**

```bash
git add src/components/navbar.tsx src/components/mobile-menu.tsx src/app/layout.tsx
git commit -m "feat: add navbar with dropdowns and mobile menu"
```

---

### Task 3: Footer Component

**Files:**
- Create: `src/components/footer.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Create the Footer**

Create `src/components/footer.tsx`:

```tsx
import Link from "next/link";

const footerLinks = [
  {
    heading: "About",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Team", href: "/about/team" },
      { label: "Services", href: "/about/services" },
      { label: "Values", href: "/about/values" },
    ],
  },
  {
    heading: "Clients",
    links: [
      { label: "Overview", href: "/clients" },
      { label: "Case Studies", href: "/clients/case-studies" },
      { label: "Client FAQs", href: "/clients/faqs" },
    ],
  },
  {
    heading: "Students",
    links: [
      { label: "Why Join Us", href: "/apply" },
      { label: "Application FAQs", href: "/apply/faqs" },
      { label: "Impact Palooza", href: "/impact-palooza" },
    ],
  },
  {
    heading: "Connect",
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "Instagram", href: "https://www.instagram.com/usciig/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/company/19111009/" },
      { label: "Facebook", href: "https://www.facebook.com/usciig" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {footerLinks.map((group) => (
            <div key={group.heading}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-green">
                {group.heading}
              </h3>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 transition-colors hover:text-white"
                      {...(link.href.startsWith("http")
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="font-serif text-lg font-bold">
            Impact Investing Group
          </p>
          <p className="text-sm text-white/50">
            &copy; {new Date().getFullYear()} Impact Investing Group at USC. All
            rights reserved.
          </p>
          <Link
            href="https://forms.gle/iT1fCQjJjf8H57JA7"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-green px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-green-dark"
          >
            Apply Now
          </Link>
        </div>
      </div>
    </footer>
  );
}
```

**Step 2: Add Footer to layout**

Update `src/app/layout.tsx` — add `import Footer from "@/components/footer";` and add after `{children}`:

```tsx
<body className="bg-cream font-sans text-text antialiased">
  <Navbar />
  <main>{children}</main>
  <Footer />
</body>
```

**Step 3: Verify and commit**

```bash
npm run dev
git add src/components/footer.tsx src/app/layout.tsx
git commit -m "feat: add footer with nav columns and social links"
```

---

### Task 4: Homepage

**Files:**
- Create: `src/components/hero.tsx`
- Create: `src/components/social-proof.tsx`
- Create: `src/components/section-heading.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Create reusable SectionHeading component**

Create `src/components/section-heading.tsx`:

```tsx
export default function SectionHeading({
  title,
  subtitle,
  centered = false,
}: {
  title: string;
  subtitle?: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "text-center" : ""}>
      <h2 className="font-serif text-4xl font-semibold text-navy md:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 max-w-2xl text-lg text-text-muted">
          {subtitle}
        </p>
      )}
    </div>
  );
}
```

**Step 2: Create Hero component**

Create `src/components/hero.tsx`:

```tsx
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-[85vh] items-center justify-center bg-navy px-6 text-center">
      {/* Subtle grain overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10 max-w-4xl">
        <h1 className="font-serif text-5xl font-bold leading-tight text-white md:text-7xl">
          Fund Ideas.
          <br />
          Forge Futures.
          <br />
          Fuel Social Change.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">
          USC&apos;s premier impact investing organization. We financially empower
          social enterprises in Los Angeles and beyond.
        </p>
        <div className="mt-10">
          <Link
            href="https://forms.gle/iT1fCQjJjf8H57JA7"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full bg-green px-8 py-4 text-lg font-semibold text-navy transition-colors hover:bg-green-dark"
          >
            Apply Now
          </Link>
        </div>
      </div>
    </section>
  );
}
```

**Step 3: Create SocialProof component**

Create `src/components/social-proof.tsx`:

```tsx
const stats = [
  { value: "12+", label: "Clients Served" },
  { value: "80+", label: "Analysts Trained" },
  { value: "6+", label: "Years of Impact" },
];

export default function SocialProof() {
  return (
    <section className="border-b border-navy/5 bg-off-white py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-8 px-6 md:flex-row md:gap-16">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-serif text-3xl font-bold text-navy">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Step 4: Build homepage**

Replace `src/app/page.tsx`:

```tsx
import Link from "next/link";
import Hero from "@/components/hero";
import SocialProof from "@/components/social-proof";
import SectionHeading from "@/components/section-heading";

const caseStudies = [
  {
    client: "LASIF",
    summary: "Market research and impact assessment for LA's social investment fund.",
    tag: "Market Research",
    href: "/clients/case-studies",
  },
  {
    client: "PS Science",
    summary: "Data analysis and growth strategy for an educational impact startup.",
    tag: "Data Analysis",
    href: "/clients/case-studies",
  },
  {
    client: "Company Volunteer Day",
    summary: "Market entry strategy for corporate volunteer engagement platform.",
    tag: "Market Entry",
    href: "/clients/case-studies",
  },
];

export default function Home() {
  return (
    <>
      <Hero />
      <SocialProof />

      {/* What We Do */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <SectionHeading title="Impact-Driven Consulting & Research" />
          <div className="space-y-4 text-text-muted">
            <p>
              Impact Investing Group offers pro-bono consulting, microfinance
              research, and impact analysis to organizations creating measurable
              social change.
            </p>
            <p>
              Our analysts work directly with clients on market research, data
              analysis, and growth strategy, delivering professional-grade
              deliverables backed by rigorous analysis.
            </p>
            <Link
              href="/about/services"
              className="inline-block font-medium text-navy underline underline-offset-4 transition-colors hover:text-navy-light"
            >
              Learn about our services
            </Link>
          </div>
        </div>
      </section>

      {/* Impact Palooza Callout */}
      <section className="bg-navy px-6 py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-green">
          Flagship Event
        </p>
        <h2 className="mt-4 font-serif text-4xl font-bold text-white md:text-5xl">
          Impact Palooza
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-white/70">
          Our annual showcase celebrating impact investing, social
          entrepreneurship, and the changemakers driving progress.
        </p>
        <Link
          href="/impact-palooza"
          className="mt-8 inline-block rounded-full border-2 border-green px-8 py-3 font-semibold text-green transition-colors hover:bg-green hover:text-navy"
        >
          Learn More
        </Link>
      </section>

      {/* Recent Case Studies */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <SectionHeading
          title="Recent Work"
          subtitle="Selected case studies from our consulting engagements."
        />
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {caseStudies.map((study) => (
            <Link
              key={study.client}
              href={study.href}
              className="group rounded-xl border border-navy/5 bg-off-white p-6 transition-all hover:border-navy/10 hover:shadow-sm"
            >
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                {study.tag}
              </span>
              <h3 className="mt-2 font-serif text-xl font-semibold text-navy">
                {study.client}
              </h3>
              <p className="mt-2 text-sm text-text-muted">{study.summary}</p>
              <span className="mt-4 inline-block text-sm font-medium text-navy group-hover:underline">
                Read more &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Instagram / Community */}
      <section className="bg-off-white px-6 py-24 text-center">
        <SectionHeading
          title="Follow Our Journey"
          centered
        />
        <p className="mt-2 text-text-muted">
          See what IIG is up to on Instagram.
        </p>
        <Link
          href="https://www.instagram.com/usciig/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block font-medium text-navy underline underline-offset-4"
        >
          @usciig
        </Link>
      </section>
    </>
  );
}
```

**Step 5: Verify and commit**

```bash
npm run dev
```

Check homepage: hero, social proof, what we do, impact palooza callout, case studies, instagram section, footer.

```bash
git add src/components/hero.tsx src/components/social-proof.tsx src/components/section-heading.tsx src/app/page.tsx
git commit -m "feat: build homepage with hero, social proof, and content sections"
```

---

### Task 5: About Pages

**Files:**
- Create: `src/app/about/page.tsx`
- Create: `src/app/about/team/page.tsx`
- Create: `src/app/about/services/page.tsx`
- Create: `src/app/about/values/page.tsx`
- Create: `src/data/team.ts`

**Step 1: Create team data file**

Create `src/data/team.ts`:

```ts
export type TeamMember = {
  name: string;
  role: string;
  major: string;
  image?: string;
  linkedin?: string;
};

export const eboard: TeamMember[] = [
  { name: "Member Name", role: "President", major: "Business Administration" },
  { name: "Member Name", role: "VP of Consulting", major: "Finance" },
  { name: "Member Name", role: "VP of Research", major: "Economics" },
  // Add real members here
];

export const analysts: TeamMember[] = [
  { name: "Analyst Name", role: "Analyst", major: "Finance" },
  // Add real members here
];
```

**Step 2: Create About Us page**

Create `src/app/about/page.tsx`:

```tsx
import SectionHeading from "@/components/section-heading";

export const metadata = { title: "About Us — IIG" };

export default function AboutPage() {
  return (
    <>
      <section className="bg-navy px-6 py-24 text-center">
        <h1 className="font-serif text-5xl font-bold text-white md:text-6xl">
          Impact Investing at USC
        </h1>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <div className="space-y-6 text-text-muted">
            <p className="text-lg">
              Founded in 2018, Impact Investing Group is USC&apos;s premier student
              organization dedicated to impact investing and social enterprise
              consulting.
            </p>
            <p>
              We educate and inspire USC undergraduates about the field of impact
              investing and social enterprise. Our analysts gain hands-on
              experience through pro-bono consulting engagements, microfinance
              research, and community investment projects.
            </p>
            <p>
              IIG bridges the gap between traditional finance education and
              purpose-driven work, preparing the next generation of investors who
              measure returns in both dollars and social impact.
            </p>
          </div>
          <div className="flex items-center justify-center rounded-xl bg-navy/5 p-8">
            <p className="text-sm text-text-muted">
              [Group photo placeholder]
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
```

**Step 3: Create Team page**

Create `src/app/about/team/page.tsx`:

```tsx
import { eboard, analysts, type TeamMember } from "@/data/team";

export const metadata = { title: "Team — IIG" };

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 h-32 w-32 rounded-full bg-navy/5" />
      <h3 className="font-semibold text-navy">{member.name}</h3>
      <p className="text-sm text-text-muted">{member.role}</p>
      <p className="text-xs text-text-muted">{member.major}</p>
    </div>
  );
}

export default function TeamPage() {
  return (
    <>
      <section className="bg-navy px-6 py-24 text-center">
        <h1 className="font-serif text-5xl font-bold text-white md:text-6xl">
          Our Team
        </h1>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="font-serif text-3xl font-semibold text-navy">
          Executive Board
        </h2>
        <div className="mt-12 grid grid-cols-2 gap-12 md:grid-cols-3">
          {eboard.map((m) => (
            <MemberCard key={m.name + m.role} member={m} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <h2 className="font-serif text-3xl font-semibold text-navy">
          Analysts
        </h2>
        <div className="mt-12 grid grid-cols-2 gap-8 md:grid-cols-4">
          {analysts.map((m) => (
            <MemberCard key={m.name + m.role} member={m} />
          ))}
        </div>
      </section>
    </>
  );
}
```

**Step 4: Create Services page**

Create `src/app/about/services/page.tsx`:

```tsx
import Link from "next/link";

export const metadata = { title: "Services — IIG" };

const services = [
  {
    name: "Consulting",
    description:
      "We partner with impact-focused organizations to deliver market research, data analysis, and strategic recommendations. Our consulting teams of 4-6 analysts work on semester-long engagements, producing professional deliverables that drive real decision-making.",
  },
  {
    name: "Microfinance",
    description:
      "Our microfinance team researches and analyzes micro-lending opportunities, evaluating social enterprises and community development financial institutions. We study how small-scale financial services can drive outsized social impact.",
  },
  {
    name: "Research",
    description:
      "We conduct independent research on impact investing trends, ESG frameworks, and social enterprise models. Our research informs both internal education and external publications.",
  },
];

export default function ServicesPage() {
  return (
    <>
      <section className="bg-navy px-6 py-24 text-center">
        <h1 className="font-serif text-5xl font-bold text-white md:text-6xl">
          Our Services
        </h1>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="space-y-20">
          {services.map((service) => (
            <div key={service.name}>
              <h2 className="font-serif text-3xl font-semibold text-navy">
                {service.name}
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-text-muted">
                {service.description}
              </p>
              <Link
                href="/clients/case-studies"
                className="mt-4 inline-block text-sm font-medium text-navy underline underline-offset-4"
              >
                See our case studies &rarr;
              </Link>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
```

**Step 5: Create Values page**

Create `src/app/about/values/page.tsx`:

```tsx
export const metadata = { title: "Values — IIG" };

const values = [
  {
    statement: "Real work, not resume padding.",
    body: "We take on engagements with measurable outcomes. Our analysts deliver professional-grade work that clients actually use.",
  },
  {
    statement: "Impact is measurable.",
    body: "We believe social good and financial rigor aren't opposites. Every engagement is grounded in data, analysis, and evidence.",
  },
  {
    statement: "Learn by doing.",
    body: "Classroom theory matters, but nothing replaces working with a real client on a real problem with real stakes.",
  },
  {
    statement: "Community over competition.",
    body: "We invest in each other. IIG is a team, not a tournament. Every member's growth is the group's growth.",
  },
  {
    statement: "Bridge finance and purpose.",
    body: "The best investors of the next generation will measure returns in both dollars and lives changed. We're training them.",
  },
];

export default function ValuesPage() {
  return (
    <>
      <section className="bg-navy px-6 py-24 text-center">
        <h1 className="font-serif text-5xl font-bold text-white md:text-6xl">
          Our Values
        </h1>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-24">
        <div className="space-y-16">
          {values.map((v) => (
            <div key={v.statement} className="text-center">
              <h2 className="font-serif text-2xl font-bold text-navy md:text-3xl">
                &ldquo;{v.statement}&rdquo;
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
```

**Step 6: Verify and commit**

```bash
npm run dev
```

Check all 4 about pages: `/about`, `/about/team`, `/about/services`, `/about/values`.

```bash
git add src/app/about/ src/data/team.ts
git commit -m "feat: add About pages (about us, team, services, values)"
```

---

### Task 6: Impact Palooza Page

**Files:**
- Create: `src/app/impact-palooza/page.tsx`

**Step 1: Create the page**

Create `src/app/impact-palooza/page.tsx`:

```tsx
export const metadata = { title: "Impact Palooza — IIG" };

export default function ImpactPaloozaPage() {
  return (
    <>
      {/* Event header */}
      <section className="bg-navy px-6 py-32 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-green">
          IIG&apos;s Signature Annual Event
        </p>
        <h1 className="mt-4 font-serif text-5xl font-bold text-white md:text-7xl">
          Impact Palooza
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-lg text-white/70">
          A celebration of impact investing, social entrepreneurship, and the
          builders creating a better world.
        </p>
        {/* Uncomment when registration opens:
        <a
          href="#"
          className="mt-10 inline-block rounded-full bg-green px-8 py-4 text-lg font-semibold text-navy transition-colors hover:bg-green-dark"
        >
          Register Now
        </a>
        */}
      </section>

      {/* What is it */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="font-serif text-3xl font-semibold text-navy">
          What is Impact Palooza?
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-text-muted">
          Impact Palooza brings together students, industry professionals, and
          social entrepreneurs for a day of panels, workshops, and networking
          focused on the intersection of finance and social good. It&apos;s our way
          of sharing what we&apos;ve learned with the broader USC community and
          beyond.
        </p>
      </section>

      {/* Past events placeholder */}
      <section className="bg-off-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center font-serif text-3xl font-semibold text-navy">
            Past Events
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex aspect-video items-center justify-center rounded-xl bg-navy/5"
              >
                <p className="text-sm text-text-muted">[Event photo {i}]</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
```

**Step 2: Verify and commit**

```bash
npm run dev
git add src/app/impact-palooza/
git commit -m "feat: add Impact Palooza event page"
```

---

### Task 7: Contact Page

**Files:**
- Create: `src/app/contact/page.tsx`

**Step 1: Create Contact page with Formspree form**

Create `src/app/contact/page.tsx`:

```tsx
import Link from "next/link";

export const metadata = { title: "Contact — IIG" };

export default function ContactPage() {
  return (
    <>
      <section className="bg-navy px-6 py-24 text-center">
        <h1 className="font-serif text-5xl font-bold text-white md:text-6xl">
          Get in Touch
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-white/70">
          For partnerships, consulting inquiries, or general questions.
        </p>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-24">
        <form
          action="https://formspree.io/f/YOUR_FORM_ID"
          method="POST"
          className="space-y-6"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-text">
                First Name <span className="text-text-muted">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                className="mt-1 w-full rounded-lg border border-navy/10 bg-white px-4 py-3 text-text focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-text">
                Last Name <span className="text-text-muted">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                className="mt-1 w-full rounded-lg border border-navy/10 bg-white px-4 py-3 text-text focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text">
              Email <span className="text-text-muted">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-navy/10 bg-white px-4 py-3 text-text focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-text">
              Subject
            </label>
            <select
              id="subject"
              name="subject"
              className="mt-1 w-full rounded-lg border border-navy/10 bg-white px-4 py-3 text-text focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            >
              <option value="general">General Inquiry</option>
              <option value="consulting">Consulting Inquiry</option>
              <option value="partnership">Partnership</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-text">
              Message <span className="text-text-muted">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              rows={6}
              required
              className="mt-1 w-full rounded-lg border border-navy/10 bg-white px-4 py-3 text-text focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-navy py-3 font-semibold text-white transition-colors hover:bg-navy-light md:w-auto md:px-12"
          >
            Send Message
          </button>
        </form>

        <div className="mt-16 flex items-center justify-center gap-8">
          <Link
            href="https://www.instagram.com/usciig/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-text-muted hover:text-navy"
          >
            Instagram
          </Link>
          <Link
            href="https://www.linkedin.com/company/19111009/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-text-muted hover:text-navy"
          >
            LinkedIn
          </Link>
          <Link
            href="https://www.facebook.com/usciig"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-text-muted hover:text-navy"
          >
            Facebook
          </Link>
        </div>
      </section>
    </>
  );
}
```

Note: Replace `YOUR_FORM_ID` with a real Formspree form ID after creating one at formspree.io.

**Step 2: Verify and commit**

```bash
npm run dev
git add src/app/contact/
git commit -m "feat: add contact page with form"
```

---

### Task 8: Clients Pages

**Files:**
- Create: `src/app/clients/page.tsx`
- Create: `src/app/clients/faqs/page.tsx`
- Create: `src/app/clients/case-studies/page.tsx`
- Create: `src/components/accordion.tsx`
- Create: `src/data/case-studies.ts`

**Step 1: Create Accordion component (reused by client and application FAQs)**

Create `src/components/accordion.tsx`:

```tsx
"use client";

import { useState } from "react";

type AccordionItem = {
  question: string;
  answer: string;
};

export default function Accordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-navy/5">
      {items.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex w-full items-center justify-between py-5 text-left"
          >
            <span className="pr-8 font-medium text-navy">{item.question}</span>
            <svg
              className={`h-5 w-5 shrink-0 text-text-muted transition-transform ${openIndex === i ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openIndex === i && (
            <div className="pb-5 text-text-muted">{item.answer}</div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Create case studies data**

Create `src/data/case-studies.ts`:

```ts
export type CaseStudy = {
  slug: string;
  client: string;
  semester: string;
  tag: string;
  summary: string;
  problem?: string;
  approach?: string;
  outcome?: string;
  testimonial?: string;
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "lasif",
    client: "LASIF",
    semester: "Spring 2023",
    tag: "Market Research",
    summary: "Market research and impact assessment for LA's social investment fund.",
    problem: "LASIF needed a comprehensive understanding of the social enterprise landscape in Los Angeles to inform their investment strategy.",
    approach: "Our team conducted in-depth market research across 50+ social enterprises, analyzing business models, impact metrics, and growth potential.",
    outcome: "Delivered a market map and investment recommendation framework that LASIF adopted for their next funding cycle.",
    testimonial: "I applaud the Impact Investing Group's thorough research and professional approach to our engagement.",
  },
  {
    slug: "ps-science",
    client: "PS Science",
    semester: "Spring 2023",
    tag: "Data Analysis",
    summary: "Data analysis and growth strategy for an educational impact startup.",
    problem: "PS Science needed to understand their program's impact data to secure additional funding.",
    approach: "We analyzed three years of program data, built impact dashboards, and created a narrative around measurable outcomes.",
    outcome: "PS Science used our analysis in their grant applications, successfully securing additional funding.",
    testimonial: "Thank you so much for bringing your team's analytical rigor to our mission.",
  },
  // Add more case studies here
];
```

**Step 3: Create Clients overview page**

Create `src/app/clients/page.tsx`:

```tsx
import Link from "next/link";

export const metadata = { title: "Clients — IIG" };

export default function ClientsPage() {
  return (
    <>
      <section className="bg-navy px-6 py-24 text-center">
        <h1 className="font-serif text-5xl font-bold text-white md:text-6xl">
          Who We Work With
        </h1>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-24">
        <p className="mx-auto max-w-3xl text-center text-lg text-text-muted">
          We partner with social enterprises, impact funds, nonprofits, and
          purpose-driven organizations. Our analysts bring academic rigor and
          fresh perspectives to every engagement.
        </p>

        {/* Client logos placeholder */}
        <div className="mt-16 grid grid-cols-3 gap-8 md:grid-cols-4">
          {["LASIF", "PS Science", "Client 3", "Client 4"].map((name) => (
            <div
              key={name}
              className="flex h-24 items-center justify-center rounded-lg border border-navy/5 bg-off-white"
            >
              <span className="text-sm font-medium text-text-muted">{name}</span>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <blockquote className="mx-auto mt-20 max-w-2xl text-center">
          <p className="font-serif text-xl italic text-navy">
            &ldquo;The Impact Investing Group brought analytical rigor and genuine
            passion for our mission. Their deliverables exceeded our
            expectations.&rdquo;
          </p>
          <cite className="mt-4 block text-sm text-text-muted">
            — Client Partner
          </cite>
        </blockquote>

        <div className="mt-16 text-center">
          <Link
            href="/contact"
            className="inline-block rounded-full bg-green px-8 py-3 font-semibold text-navy transition-colors hover:bg-green-dark"
          >
            Work with us
          </Link>
        </div>
      </section>
    </>
  );
}
```

**Step 4: Create Client FAQs page**

Create `src/app/clients/faqs/page.tsx`:

```tsx
import Accordion from "@/components/accordion";

export const metadata = { title: "Client FAQs — IIG" };

const faqs = [
  {
    question: "What types of organizations do you work with?",
    answer: "We work with social enterprises, impact investment funds, nonprofits, and any organization creating measurable social change. Our clients range from early-stage startups to established institutions.",
  },
  {
    question: "What does a typical engagement look like?",
    answer: "Engagements are semester-long (roughly 12-14 weeks). A team of 4-6 analysts is assigned to your project, meeting weekly and delivering a final report and presentation.",
  },
  {
    question: "Is your consulting pro-bono?",
    answer: "Yes. All IIG consulting engagements are pro-bono. We do this because our primary mission is education, and real client work is the best way to learn.",
  },
  {
    question: "What deliverables can I expect?",
    answer: "Deliverables vary by engagement but typically include market research reports, data analysis dashboards, strategic recommendations, and a final presentation to your team.",
  },
  {
    question: "How do I request IIG's services?",
    answer: "Reach out through our Contact page with a brief description of your organization and what you're looking for. We'll schedule an intro call to discuss fit.",
  },
];

export default function ClientFaqsPage() {
  return (
    <>
      <section className="bg-navy px-6 py-24 text-center">
        <h1 className="font-serif text-5xl font-bold text-white md:text-6xl">
          Client FAQs
        </h1>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-24">
        <Accordion items={faqs} />
      </section>
    </>
  );
}
```

**Step 5: Create Case Studies index page**

Create `src/app/clients/case-studies/page.tsx`:

```tsx
import Link from "next/link";
import { caseStudies } from "@/data/case-studies";

export const metadata = { title: "Case Studies — IIG" };

export default function CaseStudiesPage() {
  return (
    <>
      <section className="bg-navy px-6 py-24 text-center">
        <h1 className="font-serif text-5xl font-bold text-white md:text-6xl">
          Case Studies
        </h1>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="space-y-8">
          {caseStudies.map((study) => (
            <Link
              key={study.slug}
              href={`/clients/case-studies/${study.slug}`}
              className="group block rounded-xl border border-navy/5 bg-off-white p-8 transition-all hover:border-navy/10 hover:shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-navy/5 px-3 py-1 text-xs font-medium text-navy">
                  {study.tag}
                </span>
                <span className="text-xs text-text-muted">{study.semester}</span>
              </div>
              <h2 className="mt-3 font-serif text-2xl font-semibold text-navy">
                {study.client}
              </h2>
              <p className="mt-2 text-text-muted">{study.summary}</p>
              <span className="mt-4 inline-block text-sm font-medium text-navy group-hover:underline">
                Read full case study &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
```

**Step 6: Create individual case study page (dynamic route)**

Create `src/app/clients/case-studies/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { caseStudies } from "@/data/case-studies";

export function generateStaticParams() {
  return caseStudies.map((study) => ({ slug: study.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const study = caseStudies.find((s) => s.slug === params.slug);
  return { title: study ? `${study.client} — Case Study — IIG` : "Case Study — IIG" };
}

export default function CaseStudyPage({ params }: { params: { slug: string } }) {
  const study = caseStudies.find((s) => s.slug === params.slug);
  if (!study) notFound();

  return (
    <>
      <section className="bg-navy px-6 py-24 text-center">
        <span className="text-sm font-medium text-green">{study.tag} &middot; {study.semester}</span>
        <h1 className="mt-4 font-serif text-5xl font-bold text-white md:text-6xl">
          {study.client}
        </h1>
      </section>

      <article className="mx-auto max-w-3xl px-6 py-24">
        <p className="text-lg text-text-muted">{study.summary}</p>

        {study.problem && (
          <div className="mt-12">
            <h2 className="font-serif text-2xl font-semibold text-navy">The Problem</h2>
            <p className="mt-4 text-text-muted">{study.problem}</p>
          </div>
        )}

        {study.approach && (
          <div className="mt-12">
            <h2 className="font-serif text-2xl font-semibold text-navy">Our Approach</h2>
            <p className="mt-4 text-text-muted">{study.approach}</p>
          </div>
        )}

        {study.outcome && (
          <div className="mt-12">
            <h2 className="font-serif text-2xl font-semibold text-navy">The Outcome</h2>
            <p className="mt-4 text-text-muted">{study.outcome}</p>
          </div>
        )}

        {study.testimonial && (
          <blockquote className="mt-12 border-l-4 border-green pl-6">
            <p className="font-serif text-lg italic text-navy">
              &ldquo;{study.testimonial}&rdquo;
            </p>
          </blockquote>
        )}

        <div className="mt-16">
          <Link href="/clients/case-studies" className="text-sm font-medium text-navy underline underline-offset-4">
            &larr; Back to all case studies
          </Link>
        </div>
      </article>
    </>
  );
}
```

**Step 7: Verify and commit**

```bash
npm run dev
```

Check: `/clients`, `/clients/faqs`, `/clients/case-studies`, `/clients/case-studies/lasif`.

```bash
git add src/app/clients/ src/components/accordion.tsx src/data/case-studies.ts
git commit -m "feat: add Clients pages (overview, FAQs, case studies with dynamic routes)"
```

---

### Task 9: Application Pages

**Files:**
- Create: `src/app/apply/page.tsx`
- Create: `src/app/apply/faqs/page.tsx`

**Step 1: Create Why Join Us page**

Create `src/app/apply/page.tsx`:

```tsx
import Link from "next/link";

export const metadata = { title: "Why Join Us — IIG" };

const reasons = [
  {
    heading: "Do real work for real clients.",
    body: "From day one, you'll work on live consulting engagements with social enterprises and impact funds. No busywork, no simulations. Your analysis will directly inform client decisions.",
  },
  {
    heading: "Build skills that matter.",
    body: "Market research, financial modeling, data analysis, client presentations. IIG analysts build the skills that top employers in finance, consulting, and social impact look for.",
  },
  {
    heading: "Join a community, not just a club.",
    body: "IIG is tight-knit by design. Coffee chats, team dinners, socials, and a culture where senior members actively mentor newcomers. You'll make real friends here.",
  },
  {
    heading: "Launch your career with purpose.",
    body: "IIG alumni have gone on to roles at Goldman Sachs, McKinsey, Deloitte, and leading impact funds. The network and experience you build here opens doors.",
  },
];

export default function ApplyPage() {
  return (
    <>
      <section className="bg-navy px-6 py-24 text-center">
        <h1 className="font-serif text-5xl font-bold text-white md:text-6xl">
          Why IIG?
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-white/70">
          Here&apos;s what makes Impact Investing Group different.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-24">
        <div className="space-y-16">
          {reasons.map((r) => (
            <div key={r.heading}>
              <h2 className="font-serif text-2xl font-bold text-navy md:text-3xl">
                {r.heading}
              </h2>
              <p className="mt-4 text-lg text-text-muted">{r.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 rounded-xl bg-navy p-12 text-center">
          <h2 className="font-serif text-3xl font-bold text-white">
            Ready to apply?
          </h2>
          <p className="mt-3 text-white/70">
            Applications for Spring 2026 are now open.
          </p>
          <Link
            href="https://forms.gle/iT1fCQjJjf8H57JA7"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-block rounded-full bg-green px-8 py-4 text-lg font-semibold text-navy transition-colors hover:bg-green-dark"
          >
            Apply Now
          </Link>
        </div>
      </section>
    </>
  );
}
```

**Step 2: Create Application FAQs page**

Create `src/app/apply/faqs/page.tsx`:

```tsx
import Accordion from "@/components/accordion";

export const metadata = { title: "Application FAQs — IIG" };

const faqs = [
  {
    question: "What is the time commitment?",
    answer: "Analysts typically spend 5-8 hours per week on IIG, including team meetings, client work, and general body meetings. The commitment is structured to be manageable alongside a full course load.",
  },
  {
    question: "Do I need finance or investing experience?",
    answer: "No. We look for curiosity, analytical thinking, and a genuine interest in social impact. We'll teach you the finance and investing skills you need through our training program.",
  },
  {
    question: "What does the application process look like?",
    answer: "The process includes a written application, a first-round behavioral interview, and a second-round case interview. We evaluate candidates on fit, curiosity, and potential, not prior experience.",
  },
  {
    question: "What year do I need to be?",
    answer: "We accept students from all years, including freshmen. Many of our strongest analysts joined as first-years with no prior experience.",
  },
  {
    question: "When are applications open?",
    answer: "We recruit at the beginning of each semester (late August for Fall, late January for Spring). Follow @usciig on Instagram for application announcements.",
  },
  {
    question: "What majors do you accept?",
    answer: "All majors. Our members come from business, economics, engineering, humanities, sciences, and more. Diverse perspectives make our consulting better.",
  },
];

export default function ApplyFaqsPage() {
  return (
    <>
      <section className="bg-navy px-6 py-24 text-center">
        <h1 className="font-serif text-5xl font-bold text-white md:text-6xl">
          Application FAQs
        </h1>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-24">
        <Accordion items={faqs} />
      </section>
    </>
  );
}
```

**Step 3: Verify and commit**

```bash
npm run dev
```

Check `/apply` and `/apply/faqs`.

```bash
git add src/app/apply/
git commit -m "feat: add Application pages (why join us, FAQs)"
```

---

### Task 10: Responsive Polish and Meta

**Files:**
- Modify: `src/app/layout.tsx` (add meta tags)
- Create: `public/favicon.ico` (placeholder)

**Step 1: Add comprehensive metadata**

Update metadata in `src/app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  title: {
    default: "Impact Investing Group at USC",
    template: "%s — Impact Investing Group at USC",
  },
  description:
    "Fund Ideas. Forge Futures. Fuel Social Change. USC's premier impact investing organization offering consulting, microfinance, and research.",
  openGraph: {
    title: "Impact Investing Group at USC",
    description: "Fund Ideas. Forge Futures. Fuel Social Change.",
    url: "https://www.usciig.org",
    siteName: "IIG at USC",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Impact Investing Group at USC",
    description: "Fund Ideas. Forge Futures. Fuel Social Change.",
  },
};
```

**Step 2: Responsive spot-check**

Run dev server and test each page at 375px (mobile), 768px (tablet), 1280px (desktop):

```bash
npm run dev
```

Key items to verify:
- Nav collapses to hamburger below `lg` (1024px)
- Hero text scales down on mobile (`text-5xl` → readable)
- Grid columns collapse: 3-col → 2-col → 1-col
- Touch targets are all >= 44px
- No horizontal scroll at any viewport

Fix any issues found during this check.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add metadata, OG tags, and responsive polish"
```

---

### Task 11: Build and Deploy

**Step 1: Verify production build**

```bash
npm run build
```

Fix any TypeScript or build errors.

**Step 2: Test production locally**

```bash
npm start
```

Navigate through all pages. Verify no 404s, no console errors, no layout breaks.

**Step 3: Deploy to Vercel**

```bash
npx vercel --prod
```

Or connect the GitHub repo to Vercel for automatic deploys.

**Step 4: Commit any build fixes**

```bash
git add -A
git commit -m "fix: resolve build issues for production deploy"
```

---

## Content Placeholders to Fill

After the site is built, you'll need to replace these placeholders with real content:

| Placeholder | Location | What's needed |
|-------------|----------|---------------|
| Team member names | `src/data/team.ts` | Real names, roles, majors, headshots, LinkedIn URLs |
| Group photo | `/about` page | High-res team photo |
| Client logos | `/clients` page | Logo images for past clients |
| Case study details | `src/data/case-studies.ts` | Full case study write-ups |
| Event photos | `/impact-palooza` page | Past event photos |
| Stats numbers | `src/components/social-proof.tsx` | Real numbers for clients served, analysts trained, etc. |
| Formspree ID | `/contact` page | Create a form at formspree.io and add the ID |
| Application form URL | Navbar + apply page | Current Google Form link (already set, verify it's current) |

---

## Summary

| Task | Scope | Estimated steps |
|------|-------|-----------------|
| 1. Project scaffolding | Next.js + Tailwind + fonts + tokens | 7 |
| 2. Navbar | Desktop + mobile nav with dropdowns | 5 |
| 3. Footer | 4-column footer | 3 |
| 4. Homepage | Hero + 5 sections | 5 |
| 5. About pages | 4 pages + team data | 6 |
| 6. Impact Palooza | Event landing page | 2 |
| 7. Contact | Form page | 2 |
| 8. Clients pages | 3 pages + accordion + data + dynamic route | 7 |
| 9. Application pages | 2 pages | 3 |
| 10. Responsive + meta | Polish pass | 3 |
| 11. Build + deploy | Production verification | 4 |
| **Total** | **13 pages, ~15 components** | **47 steps** |
