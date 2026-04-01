# BIA Roommate + Course Helper

A platform for USC, UC Berkeley, and Stanford students to find roommates and plan course schedules. Built by **BIA at USC**.

**Live:** [bia-roommate.vercel.app](https://bia-roommate.vercel.app)

## Features

### Roommate Matching

- Browse and filter roommate profiles by school, year, gender, and tags
- Submit your own profile with living habits, hobbies, and preferences
- School-branded cards with USC / Cal / Stanford logo badges
- Bilingual support (English + Chinese)

### Course Planner

- Search USC courses by department, number, or keyword
- Filter by GE category and semester
- Schedule optimizer: reads your course bin and builds conflict-free schedules
- Interest-based course discovery: describe what you like and get matching courses
- Visual weekly calendar view

### Chrome Extension (`/extension`)

A Manifest V3 Chrome extension that enhances USC's WebReg and Schedule of Classes:

- **RateMyProfessors ratings** inline next to instructor names
- **Seat count badges** showing enrollment / capacity per section
- **Time conflict highlighting** on WebReg
- **Schedule optimizer** and **interest-based discovery** in the popup
- All data cached locally via `chrome.storage`

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS
- **Backend:** Next.js API routes, Supabase (profiles)
- **Extension:** Vite, TypeScript, Chrome Manifest V3
- **Deployment:** Vercel

## Getting Started

### Web App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Chrome Extension

```bash
cd extension
npm install
npx vite build
```

Then load `extension/dist/` as an unpacked extension in `chrome://extensions`.

## Project Structure

```
app/
  page.tsx              # Roommate feed (home)
  submit/               # Profile submission form
  course-planner/       # Course planner page
  usc-group/            # USC group page
  api/
    courses/            # Course search, GE, autocomplete, coursebin, recommendations
    rmp/                # RateMyProfessors batch + search proxy
components/             # ProfileCard, ProfileModal, NavTabs, course-planner components
extension/
  src/
    content/            # Content scripts (RMP badges, seat counts, conflicts)
    background/         # Service worker (API client, cache)
    popup/              # React popup (optimizer, discover, settings)
    shared/             # Shared types and constants
lib/                    # Utils, types, Supabase client, CORS helpers
public/schools/         # School logo SVGs
```

## Environment Variables

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## License

Built by BIA at USC.
