# BIA Landing Page — Design System

The design language of the home page (`app/page.tsx`), distilled into a reference
so other pages — the membership page, future marketing pages — can be reworked to
match it instead of drifting.

> **Two systems live in this repo.** The **Landing system** (this doc — soft,
> editorial, glassy; light base with full-bleed dark bands) is the **default for
> every outward-facing page**: home, about, events, **membership**, blog, and all
> marketing pages. The **Brutalist system** (3px borders, hard offset shadows,
> Bebas Neue, uppercase) is reserved for **新生服务 only** — the student-tools
> pages (`/roommates`, `/course-planner`, `/course-rating`, `/sublet`,
> `/usc-group`, `/apartments`) and the `ProductShell`. Don't mix them on one page.
> Tokens for both live in `app/globals.css`.
>
> *Heads-up: `/about` and `/events` currently render in a bordered
> `MarketingShell` style that predates this rule — they should migrate to the
> Landing system too.*

> **One nav, one footer.** Every Landing-system page shares the **same top nav and
> footer** — a single `SiteNav` + `SiteFooter` (the glass floating navbar + the
> footer from the home page) so links never drift. Canonical links: About →
> `/about`, Events → `/events`, 新生服务 → `/roommates`, Blog → `/blog`,
> George 👻 → `/george/about`, Join Us → `/join`. Don't hand-copy the navbar onto a
> page (that's how membership ended up with a stale George link).

---

## 1. Palette

Landing tokens (`app/globals.css :root`, "Landing page system") plus the hexes
used inline on the home page.

| Role | Value | Where |
|------|-------|-------|
| **Base surface** | `#F9FAF7` (`--bg-primary`) | default page background, light sections |
| **Ink (primary text)** | `#171717` (`--text-dark`) | headings, body on light |
| **Muted text** | `#646464` (`--text-muted`) · `#999` for kickers | secondary copy, labels |
| **Dark canvas** | `#1F1F29` (`--navy`) | hero bg, featured bands, footer |
| **Signature teal** | `#A0D7D1` (`--accent-teal`) · bright `#6DD4D4` | accents, kickers, hairline underlines, CTA glow, status dots |
| **Wine / cardinal** | `#71031F` → `#8B0A2A` (gradient pair) | icon squares, brand-red accents, glow |
| **Gold** | `#C9A96E` (editorial) | warm accent, tier highlights |
| **Feature support** | blue `#0081C0` · olive `#334444` | BorderGlow palettes, rare accents |

Notes
- The landing red is the **deep wine `#71031F`**, *not* the brutalist
  `--cardinal: #990000`. Keep landing reds in the `#71031F`–`#8B0A2A` range.
- Dark sections use white text at reduced opacity (`text-white/70`, `/50`, `/40`)
  rather than a second grey.

---

## 2. Typography

| Use | Family | How |
|-----|--------|-----|
| **Display** | `.heading-serif` → Instrument Serif (elegant high-contrast serif) | `letter-spacing: -1px`, `text-wrap: balance`. All big headings. |
| **Script flourish** | `--font-playlist` (Playlist Script) | ONE word, sparingly (e.g. "USC" in the hero), in wine `#71031F` with a soft text-shadow. Never a full line. |
| **Chinese display** | `--font-display-zh` (ZCOOL XiaoWei / PingFang SC) | Chinese headings + labels (新生通, tool names). Pair with the serif for EN. |
| **Body** | Inter (`--font-body`), 400/500/700 | airy, `leading-relaxed`; light weights preferred. |
| **Kicker / eyebrow** | Inter | `text-xs uppercase tracking-widest text-[#999]` above a heading. |

Scale (home page):
- Hero title: `text-[16vw] sm:text-[120px] leading-none` (serif).
- Section heading: `text-4xl sm:text-5xl` (serif).
- Card title: `text-2xl sm:text-3xl` (serif or zh-display).
- Body: `text-base / text-lg leading-relaxed`.

---

## 3. Layout & rhythm

- **Section padding:** `py-24 sm:py-32` vertical, `px-6 sm:px-16` horizontal.
- **Content widths:** centered `max-w-5xl` (text-forward) / `max-w-6xl` / `max-w-7xl` `mx-auto`.
- **Signature move — sticky hero + scroll-over overlay:** the hero is
  `sticky top-0 h-[95vh]` with a full-bleed image on `#1F1F29`; the content
  wrapper sits `rounded-t-[2.5rem] -mt-10 shadow-[0_-8px_40px_rgba(0,0,0,0.2)]`
  and **scrolls up over** the pinned hero.
- **Alternating bands:** light `#F9FAF7` content sections interleaved with
  full-bleed dark `#1F1F29` feature bands (hero, featured event, footer). This
  contrast IS the rhythm — use a dark band when a section should feel like a moment.
- **Hairline dividers:** `h-px bg-gradient-to-r from-transparent via-black/10 to-transparent`.
- **Fixed footer reveal:** a `fixed` dark footer (`70vh`, night image, low opacity)
  that the page scrolls away to reveal at the end.

---

## 4. Surfaces & components

- **Card:** white, `rounded-[28px]` (or `rounded-2xl/3xl`), `border border-black/5`,
  soft shadow `shadow-[0_12px_44px_rgba(0,0,0,0.10)]`, padding `p-8 sm:p-10`.
- **Icon square:** `w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br
  from-[#8B0A2A] to-[#71031f]`, white character set in `--font-display-zh`.
- **Primary CTA:** white bg, `text-[#1F1F29]`, `rounded-[10–12px]`,
  `font-bold uppercase tracking-wide`, trailing arrow (`ArrowIcon`),
  `min-h-[48–52px]` — usually wrapped in **`<BorderGlow>`** (animated teal/white
  glow, colors `["#A0D7D1","#6DD4D4","#ffffff"]`).
- **Pill / badge:** `border border-white/30 rounded-full px-4 py-1.5 text-xs
  font-semibold uppercase tracking-wider`, often with a pulsing `bg-green-400` dot.
- **Glass navbar — `<GlassSurface>`:** fixed `top-6`, `max-w-4xl`, `borderRadius 16`,
  backdrop-blur + light displacement; dark translucent glass floating over content.
- **Imagery:** `rounded-2xl/3xl overflow-hidden`, `object-cover`, hover `scale-105`
  (slow, 700ms–3s); dark text-legibility gradient
  `bg-gradient-to-t from-black/70 via-black/20 to-transparent` when text overlays.

Reusable components: `GlassSurface`, `BorderGlow`, `ScrollFloat`, `ScrollStack`,
`BlogPreview` (`components/`).

---

## 5. Motion

- **Smooth scroll:** Lenis on the home page (via `ScrollStack`); scroll drives transforms.
  Touch is tuned to `touchMultiplier: 1` (1:1 swipe) — keep it there for mobile calm.
- **`ScrollFloat`:** per-character staggered reveal of the serif hero title on mount
  (`ease: back.out(1.7)`, `stagger 0.05`, `mountDelay 0.3`).
- **`ScrollStack`:** scroll-pinned cards that stack + scale as you pass a section.
- **Micro-interactions:** image `scale-105`; arrow `translate-x-1` on `group-hover`;
  CTA `gap` grows on hover; `.link-hover` animated underline (`scaleX`).
- **Easing & tempo:** premium and unhurried — `cubic-bezier(0.16, 1, 0.3, 1)`,
  durations 200ms (UI) → 3s+ (ambient image drift). Nothing snappy.

---

## 6. Voice & imagery

- **Manifesto:** humanity · technology · art — *wonder, warmth, a little daring.*
  Copy should make someone *feel* something, not read a definition. (See `/about`
  and the membership form description.)
- **Bilingual:** every user-facing string is EN + 中文 via `lib/i18n.ts`
  (`t.<section>.<key>[lang]`). Add copy there first.
- **Imagery:** warm, illustrated/anime USC campus at golden hour; real event
  photography; cardinal/gold/teal accents over `#1F1F29`.

---

## 7. Reworking a page into this language (checklist)

When pulling a page (e.g. **membership / `/join`**) into the landing system:

- [ ] Base on `#F9FAF7` light; use `#1F1F29` dark **bands** for hero + "moment"
      sections instead of an all-dark page.
- [ ] Headings in `.heading-serif`; one optional Playlist-Script flourish word.
- [ ] Section rhythm `py-24 sm:py-32`, `max-w-6xl mx-auto`, hairline dividers.
- [ ] Cards = white `rounded-[28px]`, `border-black/5`, soft shadow; icon squares
      in the wine gradient.
- [ ] CTAs = white button + `BorderGlow`, uppercase, arrow, `min-h-[48px]`.
- [ ] Reuse `GlassSurface` for the nav so it matches the home navbar (and points at
      the real routes: About → `/about`, Events → `/events`).
- [ ] All copy bilingual via `lib/i18n.ts`; tone per the manifesto.
- [ ] Motion: `ScrollFloat` for the hero line; restrained hover transitions.
