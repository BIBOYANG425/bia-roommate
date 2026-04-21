<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]



<!-- PROJECT LOGO -->
<br />
<div align="center">

<h3 align="center">BIA Roommate + Course Helper + George Tirebiter</h3>

  <p align="center">
    A platform for USC international students to find roommates, plan courses, and chat with George — BIA's AI companion on WeChat and iMessage.
    <br />
    <br />
    <a href="https://bia-roommate.vercel.app">Live Site</a>
    &middot;
    <a href="https://github.com/BIBOYANG425/bia-roommate/issues/new?labels=bug">Report Bug</a>
    &middot;
    <a href="https://github.com/BIBOYANG425/bia-roommate/issues/new?labels=enhancement">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#web-app">Web App</a></li>
        <li><a href="#chrome-extension">Chrome Extension</a></li>
        <li><a href="#george-ai-companion">George AI Companion</a></li>
      </ul>
    </li>
    <li><a href="#features">Features</a></li>
    <li><a href="#architecture">Architecture</a></li>
    <li><a href="#environment-variables">Environment Variables</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

BIA Roommate is a suite of products built by **[BIA at USC](https://bia-roommate.vercel.app)** (Bridging Internationals Association) to serve the 1,500+ member USC international student community. It includes:

1. **Roommate Matcher** — browse, filter, and submit roommate profiles across USC, UC Berkeley, and Stanford
2. **Course Planner** — search USC courses, optimize schedules, and discover courses by interest
3. **Chrome Extension** — RateMyProfessors ratings, seat counts, and time-conflict highlighting injected into USC WebReg
4. **George Tirebiter** — a bilingual (Chinese/English) AI companion that answers student questions about events, courses, housing, and campus life via WeChat and iMessage

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* [![Next][Next.js]][Next-url]
* [![React][React.js]][React-url]
* [![TypeScript][TypeScript]][TypeScript-url]
* [![Tailwind][TailwindCSS]][Tailwind-url]
* [![Supabase][Supabase]][Supabase-url]
* [![Express][Express.js]][Express-url]
* [![Docker][Docker]][Docker-url]
* [![Vercel][Vercel]][Vercel-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

The repo contains three independent packages: the **Next.js web app** (root), the **Chrome extension** (`/extension`), and the **George backend** (`/george`).

### Prerequisites

* Node.js 20+
* npm
  ```sh
  npm install npm@latest -g
  ```

### Web App

```sh
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### Chrome Extension

```sh
cd extension
npm install
npx vite build
```
Load `extension/dist/` as an unpacked extension in `chrome://extensions`.

### George AI Companion

```sh
cd george
npm install
```

Create a `.env` file in `george/`:
```env
# Required
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional — WeChat Official Account
WECHAT_TOKEN=your_token
WECHAT_APP_ID=wx...
WECHAT_APP_SECRET=...

# Optional — iMessage (macOS only, requires Full Disk Access)
IMESSAGE_ENABLED=true

# Optional — Kimi (lightweight LLM fallback)
KIMI_API_KEY=...

# Optional — feature flags
PROACTIVE_ENABLED=true
PROACTIVE_ROLLOUT_PCT=10
ADMIN_TOKEN=your_admin_token
```

Run locally:
```sh
npm run dev    # tsx watch mode
```

Or build and run in Docker:
```sh
npm run build
docker build -t george .
docker run -p 3001:3001 --env-file .env george
```

Verify it's running:
```sh
curl http://localhost:3001/health
# {"status":"ok","character":"George Tirebiter 👻🐕","tools":16}
```

Test with the admin chat endpoint:
```sh
curl -X POST http://localhost:3001/chat \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "USC附近有什么好吃的？", "platform": "imessage"}'
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- FEATURES -->
## Features

### Roommate Matching
- Browse and filter profiles by school, year, gender, and tags
- Submit profiles with living habits, hobbies, and preferences
- School-branded cards with USC / Cal / Stanford logo badges
- Bilingual support (English + Chinese)

### Course Planner
- Search USC courses by department, number, or keyword
- Filter by GE category and semester
- Schedule optimizer: reads your course bin and builds conflict-free schedules
- Interest-based course discovery
- Visual weekly calendar view

### Chrome Extension
- **RateMyProfessors ratings** inline next to instructor names
- **Seat count badges** showing enrollment / capacity per section
- **Time conflict highlighting** on WebReg
- **Schedule optimizer** and **interest-based discovery** in the popup
- All data cached locally via `chrome.storage`

### George Tirebiter — AI Companion

George is a bilingual AI companion deployed on WeChat Official Account and iMessage. He answers questions about USC events, courses, housing, social connections, and campus life.

**Multi-Agent Architecture:**
| Sub-Agent | Handles | Key Tools |
|-----------|---------|-----------|
| Event | BIA/USC events, RSVPs, reminders | search_events, set_reminder, suggest_connection |
| Course | Course search, reviews, schedule planning | search_courses, get_course_reviews, plan_schedule |
| Housing | Sublets, roommate matching, neighborhoods | search_sublets, post_sublet, search_roommates |
| Social | Student connections, interest matching | suggest_connection, search_roommates |
| Campus | Study spots, food, buildings, campus tips | campus_knowledge, update_profile |

**Other Capabilities:**
- Intent classification routes each message to the right sub-agent
- Calendar-driven mood system (grumpy during finals, excited at orientation)
- Stateful onboarding that collects student profile info over multiple turns
- Proactive event recommendations every 3 hours based on student interests
- Scheduled reminders for RSVPed events
- Async memory extraction (remembers food preferences, plans, interests)
- Prompt injection detection and rate limiting (10 msg/min)
- 16 tools across 5 domain agents + a markdown skill/playbook system

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ARCHITECTURE -->
## Architecture

```
├── app/                        # Next.js web app
│   ├── page.tsx                #   Roommate feed (home)
│   ├── submit/                 #   Profile submission form
│   ├── course-planner/         #   Course planner page
│   ├── usc-group/              #   USC group page
│   └── api/                    #   API routes (courses, RMP proxy)
├── components/                 # React components (ProfileCard, NavTabs, etc.)
├── lib/                        # Utils, types, Supabase client, CORS helpers
├── public/                     # Static assets, school logos
│
├── extension/                  # Chrome Extension (Manifest V3)
│   └── src/
│       ├── content/            #   Content scripts (RMP badges, seat counts)
│       ├── background/         #   Service worker (API client, cache)
│       ├── popup/              #   React popup (optimizer, discover)
│       └── shared/             #   Shared types and constants
│
├── george/                     # George Tirebiter AI Companion
│   ├── src/
│   │   ├── index.ts            #   Express server entry point
│   │   ├── config.ts           #   Environment config
│   │   ├── adapters/           #   Platform adapters
│   │   │   ├── wechat.ts       #     WeChat Official Account (XML, token mgmt)
│   │   │   ├── imessage.ts     #     macOS iMessage via @photon-ai/imessage-kit
│   │   │   ├── rate-limiter.ts #     10 msg/min sliding window
│   │   │   └── send-message.ts #     Platform-agnostic message dispatch
│   │   ├── agent/              #   AI agent pipeline
│   │   │   ├── george.ts       #     Main message processor + tool loop
│   │   │   ├── intent-classifier.ts  # Routes to event|course|housing|social|campus
│   │   │   ├── personality.ts  #     Sub-agent personas, mood system, onboarding
│   │   │   ├── bia-lore.ts     #     BIA cultural grounding blocks
│   │   │   ├── tool-registry.ts #    Central tool registration & execution
│   │   │   └── llm-providers.ts #    Claude Sonnet + Kimi/Haiku fallback
│   │   ├── tools/              #   16 tool implementations
│   │   ├── skills/             #   Markdown playbooks (YAML frontmatter)
│   │   │   ├── orchestrator/   #     Always-on: onboarding, safety, preferences
│   │   │   └── sub-agents/     #     Domain: event, course, social
│   │   ├── db/                 #   Supabase: students, messages, events, reminders
│   │   ├── jobs/               #   Cron: proactive matching, reminders, memory extraction
│   │   ├── security/           #   Injection filter, XSS sanitization
│   │   ├── observability/      #   Structured JSON logger + /stats endpoint
│   │   └── scrapers/           #   Instagram + USC event ingestion
│   ├── data/
│   │   ├── campus-knowledge.sql #  Study spots, food, buildings (50+ entries)
│   │   └── usc-calendar.json  #   Academic calendar for mood system
│   ├── tests/                  #   Vitest: injection, personality, tools, round-trip
│   └── Dockerfile              #   Node 20 slim, port 3001
│
└── supabase/                   # Database migrations
```

### George Message Flow

```
Incoming message (WeChat / iMessage)
  │
  ├─ Non-text? → playful refusal
  ├─ Rate limited? → "你发消息的速度比我穿墙还快！"
  ├─ Injection detected? → humorous deflection
  │
  ├─ Resolve/create student record
  ├─ Load conversation history (20 msgs) + memories
  ├─ Intent classification → event|course|housing|social|campus
  │
  ├─ Sub-agent execution (Claude Sonnet 4.6)
  │   ├─ Scoped tools (only domain-relevant)
  │   ├─ Up to 12 tool-call iterations
  │   └─ Personality: BIA senior voice + calendar mood
  │
  ├─ Save to DB + async memory extraction
  └─ Send response via platform adapter
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ENVIRONMENT VARIABLES -->
## Environment Variables

### Web App (`.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (shipping admin) | Service-role key. Required for `/api/shipping/admin/*` routes. Never exposed to the client — see `lib/supabase/admin.ts` |
| `ADMIN_EMAILS` | Yes (shipping admin) | Comma-separated lowercased emails allowed to access `/shipping/admin/*`. Example: `ops@bia.org,warehouse@bia.org` |
| `GEORGE_URL` | Yes (shipping admin) | Base URL of the George backend, e.g. `http://localhost:3001` in dev. Used to enqueue WeChat/iMessage notifications on parcel state transitions |
| `GEORGE_ADMIN_TOKEN` | Yes (shipping admin) | Must match George's `ADMIN_TOKEN`. Sent as `Authorization: Bearer …` when the web app calls `POST /admin/enqueue-notification` |

### George (`george/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key (Sonnet 4.6) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `WECHAT_TOKEN` | No | WeChat Official Account verification token |
| `WECHAT_APP_ID` | No | WeChat App ID |
| `WECHAT_APP_SECRET` | No | WeChat App Secret |
| `IMESSAGE_ENABLED` | No | Enable iMessage adapter (macOS only) |
| `KIMI_API_KEY` | No | Moonshot AI key for lightweight tasks |
| `ADMIN_TOKEN` | No | Bearer token for `/chat` and `/admin/*` endpoints |
| `PROACTIVE_ENABLED` | No | Enable proactive event matching (default: true) |
| `PROACTIVE_ROLLOUT_PCT` | No | % of students to send proactive messages (default: 10) |
| `APIFY_TOKEN` | No | Apify token for Instagram scraping |
| `BIA_ROOMMATE_API_URL` | No | Course data API (default: http://localhost:3000) |
| `PORT` | No | George server port (default: 3001) |

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ROADMAP -->
## Roadmap

- [x] Roommate matching with multi-school support
- [x] Course planner with schedule optimizer
- [x] Chrome extension for WebReg enhancement
- [x] George Tirebiter AI companion (WeChat + iMessage)
- [x] Prompt caching + sampling optimization
- [x] BIA cultural lore grounding + anti-pattern voice linter
- [x] Voice rewrite — BIA senior tone
- [ ] Voice-eval harness (LLM-as-judge over fixture prompts)
- [ ] Sublet platform with map view
- [ ] Course reviews aggregation
- [ ] George on more platforms (Discord, Slack)

See the [open issues](https://github.com/BIBOYANG425/bia-roommate/issues) for a full list of proposed features and known issues.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Top contributors:

<a href="https://github.com/BIBOYANG425/bia-roommate/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=BIBOYANG425/bia-roommate" alt="contrib.rocks image" />
</a>



<!-- CONTACT -->
## Contact

BIA at USC - yangb7777@gmail.com

Project Link: [https://github.com/BIBOYANG425/bia-roommate](https://github.com/BIBOYANG425/bia-roommate)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Anthropic Claude](https://www.anthropic.com/) — George's brain (Sonnet 4.6)
* [Supabase](https://supabase.com/) — Database and auth
* [Vercel](https://vercel.com/) — Web app hosting
* [BIA at USC](https://bia-roommate.vercel.app) — Community and vision
* [Best-README-Template](https://github.com/othneildrew/Best-README-Template)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/BIBOYANG425/bia-roommate.svg?style=for-the-badge
[contributors-url]: https://github.com/BIBOYANG425/bia-roommate/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/BIBOYANG425/bia-roommate.svg?style=for-the-badge
[forks-url]: https://github.com/BIBOYANG425/bia-roommate/network/members
[stars-shield]: https://img.shields.io/github/stars/BIBOYANG425/bia-roommate.svg?style=for-the-badge
[stars-url]: https://github.com/BIBOYANG425/bia-roommate/stargazers
[issues-shield]: https://img.shields.io/github/issues/BIBOYANG425/bia-roommate.svg?style=for-the-badge
[issues-url]: https://github.com/BIBOYANG425/bia-roommate/issues
[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[TypeScript]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[TailwindCSS]: https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[Supabase]: https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white
[Supabase-url]: https://supabase.com/
[Express.js]: https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white
[Express-url]: https://expressjs.com/
[Docker]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[Docker-url]: https://www.docker.com/
[Vercel]: https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white
[Vercel-url]: https://vercel.com/
