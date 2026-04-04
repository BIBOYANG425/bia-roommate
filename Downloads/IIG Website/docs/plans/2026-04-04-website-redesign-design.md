# IIG Website Redesign — Design Document

**Date:** 2026-04-04
**Approach:** The Editorial (Parable VC-inspired)
**Platform:** Next.js (custom build)
**Inspiration:** https://www.parablevc.com/

---

## Goals

1. **Drive recruitment** — make students want to apply within 10 seconds
2. **Build client credibility** — impress consulting clients and partners
3. Both audiences served equally through a premium editorial design

---

## Brand System

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--navy` | `#16165F` | Primary brand, hero backgrounds, section backgrounds |
| `--navy-light` | `#1E1E7A` | Hover states, secondary surfaces |
| `--green` | `#9BD97C` | CTA buttons, success states, accents |
| `--green-dark` | `#7ABF5A` | CTA hover |
| `--cream` | `#F8F7F4` | Page background (warm, not pure white) |
| `--off-white` | `#FAFAF8` | Card/section backgrounds |
| `--text` | `#1A1A2E` | Body text (near-black with blue undertone) |
| `--text-muted` | `#6B6B80` | Secondary text, captions |

Key decision: warm cream backgrounds instead of pure white. Navy stays as anchor. Green used sparingly for CTAs only.

### Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Display headings | Playfair Display (serif) | 700 | 56-72px |
| Section headings | Playfair Display | 600 | 36-44px |
| Subheadings | Inter | 600 | 20-24px |
| Body | Inter | 400 | 16-18px |
| Captions/labels | Inter | 500 | 13-14px |

Two fonts. Serif for gravitas, Inter for readability.

---

## Site Map

```
Home
About/
  ├── About Us
  ├── Team
  ├── Services
  └── Values
Impact Palooza
Contact
Clients/
  ├── General
  ├── Client FAQs
  └── Case Studies (index + individual pages)
Application/
  ├── Why Join Us
  └── FAQs
```

13 pages, 6 top-level nav items.

---

## Navigation

- Logo (left), 6 nav items (center), green "Apply Now" CTA (right)
- Single line, no wrapping
- Dropdowns for About, Clients, Application on hover
- Sticky on scroll with backdrop blur
- Mobile: hamburger menu

---

## Page Designs

### Homepage

1. **Hero:** Full-bleed navy background. Large serif headline: "Fund Ideas. Forge Futures. Fuel Social Change." One line of supporting text. One green CTA: "Apply Now". Subtle animated gradient or grain texture on the navy. No photo.

2. **Social proof bar:** Slim horizontal strip. "12+ clients served | 80+ analysts trained | $X in impact deployed". Light background, muted text.

3. **What We Do:** Two-column layout. Left: serif heading "Impact-Driven Consulting & Research". Right: 2-3 paragraphs explaining the three service lines. No icons, no cards. Editorial text.

4. **Impact Palooza callout:** Full-width navy section. Event name in large serif type, date, one-line description, "Learn More" button. Feels like an event poster.

5. **Recent Case Studies:** 2-3 text-forward case study cards in a row. Client name, one-line summary, service type tag, "Read more" link. No images needed.

6. **Instagram / Community strip:** Grid of 4-6 Instagram photos from @usciig. Below: "Follow us @usciig".

7. **Footer:** Navy background. Logo, nav links in columns, social icons, "Apply Now" CTA.

### About Us (`/about`)

Editorial long-form. Full-width serif heading: "Impact Investing at USC". Two-column: mission text (left) + group photo (right). Below: timeline of IIG's growth and milestones. Sections separated by generous padding, no dividers.

### Team (`/about/team`)

E-Board at top in larger format (2-3 per row): headshot, name, role, LinkedIn. Analysts below in tighter grid (4 per row). Organized by current semester. Collapsible "Alumni" section at bottom.

### Services (`/about/services`)

Three stacked vertical sections, one per service line (Consulting, Microfinance, Research). Each gets: serif heading, 2-3 paragraphs describing the service, "See our case studies" link. No icons, no cards.

### Values (`/about/values`)

Centered serif heading. 4-5 values in manifesto style: bold statement + one supporting sentence. Example: **"Real work, not resume padding."**

### Impact Palooza (`/impact-palooza`)

Event landing page. Navy background header with title, date, location. "What is Impact Palooza?" section. Speakers/panelists grid. "Past Events" photo gallery and recap. Green "Register Now" CTA when registration is open.

### Contact (`/contact`)

Centered layout. Serif heading: "Get in Touch". Short descriptor line. Form: Name, Email, Subject (dropdown), Message, Send. Below: email and social links.

### Clients — General (`/clients`)

Serif heading: "Who We Work With". Short paragraph. Client logo grid. Pull quote/testimonial. Green CTA: "Work with us" → Contact.

### Clients — FAQs (`/clients/faqs`)

Accordion FAQ list. One column, centered. Questions in bold Inter, answers expand. Categories if needed.

### Clients — Case Studies (`/clients/case-studies`)

Index page: list of case studies with client name, semester, service type tag, one-line summary, "Read more" link. Individual pages: editorial long-form with problem, approach, outcome, client testimonial.

### Application — Why Join Us (`/apply`)

Recruitment pitch. Serif heading: "Why IIG?" 3-4 sections with bold statements and supporting paragraphs (what analysts do, skills, community, career outcomes). Large green CTA: "Apply for [Current Semester]" → Google Form.

### Application — FAQs (`/apply/faqs`)

Accordion FAQ. Questions about time commitment, experience needed, interview process, etc.

---

## Design Principles

1. **No decoration without purpose.** No wavy dividers, no blobs, no icons-in-circles. If a section feels empty, it needs better content, not decoration.
2. **Let the writing work.** Serif headings and clean body text carry the design. If the copy is weak, the design is weak.
3. **Earn your space.** Every section must justify its height with real content.
4. **Two fonts, one voice.** Playfair Display + Inter. No exceptions.
5. **Green is precious.** Only used for CTAs. Everything else is navy, cream, and text colors.

---

## Technical Stack

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS
- **Fonts:** Google Fonts (Playfair Display + Inter)
- **Deployment:** Vercel
- **CMS:** Markdown files or Notion API for case studies and team data (keeps it simple)
- **Instagram:** Embed or API for the community strip
- **Forms:** Contact form via Formspree or similar (no backend needed)
- **Analytics:** Vercel Analytics or Plausible

---

## What's NOT in scope

- User authentication / member portal
- Blog
- Dynamic event registration system
- CMS admin panel (content updated via code/markdown)
- Dark mode (single theme)
