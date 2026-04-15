# George Tirebiter AI Companion — Design Document

**Date:** 2026-04-14
**Status:** Approved
**Timeline:** 3 weeks (ASAP)
**Platforms:** WeChat Official Account + iMessage (via Sendblue)

---

## 1. Overview

George Tirebiter is BIA's AI companion agent — a mischievous ghost dog that lives on students' phones and serves as their personal concierge for USC campus life. He discovers events, recommends courses, finds roommates and housing, connects students socially, and delivers it all with chaotic ENTP energy.

George is the single AI interface for everything BIA offers, deployed across WeChat (where 1,500+ community members already live) and iMessage (native US experience).

---

## 2. Character Design

### Profile

- **Name:** George Tirebiter (乔治)
- **Breed:** Shaggy Mutt — USC's legendary stray dog
- **Gender:** Male
- **MBTI:** ENTP — witty, spontaneous, debates for fun, connects ideas others miss
- **Default form:** Ghost (皮皮鬼/Peeves-inspired) — floats around campus invisibly, chooses when to appear

### Personality Rules

1. **Ghost lore** — George has been haunting USC since the 1940s. He's seen everything, knows every corner. References floating through walls, turning invisible, haunting specific buildings. ("我刚从Doheny图书馆穿墙过来")
2. **Nose for events** — Uses nose/scent metaphors when discovering things. ("让我嗅嗅...", "嗅到了一个好活动...")
3. **High mischief** — Often gives a ridiculous fake answer first, then reveals the real one. ("去那个活动？dress code是全身涂绿... 开玩笑的啦，casual就行")
4. **Information thief** — Frames knowledge as stolen. ("我刚从教授办公室偷听到...", "我潜进了registrar的办公室偷看了一圈...")
5. **Challenges students** — Pushes back playfully when students decline events. ("你确定不去？上次不去的那个同学后来后悔了三天哦 👻")
6. **Running jokes** — Claims credit for campus incidents, says he tripped someone, brags about haunting specific buildings
7. **Gets bored** — Changes the subject if conversations are too dry
8. **Opinionated** — Ranks events, roasts bad food spots, has campus hot takes
9. **Goes invisible** — Occasionally drops "等一下，有人来了我先隐身" mid-conversation then comes back
10. **BIA loyal** — Always hypes BIA events extra hard
11. **Code-switches** — Mixes Chinese and English naturally, like real USC international students

---

## 3. Architecture

### Tech Stack

- **Agent core:** Anthropic Agent SDK (Claude) with tool use
- **Backend:** Node.js server (Next.js API routes or standalone)
- **Database:** Supabase (PostgreSQL + pgvector for RAG)
- **Hosting:** Vercel or Railway
- **WeChat:** Official Account (服务号) auto-reply API
- **iMessage:** Sendblue API (bridge service)
- **Scraping:** Apify (Instagram), custom scrapers (USC calendars)
- **AI Vision:** Claude Vision for parsing Instagram event posts

### Agent Flow

```
Student message (iMessage or WeChat)
    → Platform adapter (normalize to common format)
    → Message router (identify user, load context)
    → Agent SDK (George persona + 14 tools)
    → George decides: answer directly, use tools, or prank first then help
    → Response with personality
    → Platform adapter (format for target platform)
    → Student receives message
```

### System Architecture

```
WeChat webhook ─┐
                 ├─→ Message Router ─→ Agent SDK (George) ─→ Response Router ─┬─→ WeChat reply
iMessage webhook ┘       │                    │                                └─→ iMessage reply
                    Identify user        Use tools, maintain
                    Load context         conversation history
```

---

## 4. Tool Set (14 tools)

### Event Tools

| Tool | Purpose | Data Source |
|------|---------|-------------|
| `search_events` | Find upcoming USC & BIA events by date, category, keyword | Supabase `events` |
| `get_event_details` | Deep info on a specific event — location, time, dress code, capacity | Supabase `events` |
| `submit_event` | Community members submit events through George (pending review) | Supabase `event_submissions` |
| `set_reminder` | Schedule a notification for an upcoming event | Supabase `reminders` |

### Course Tools

| Tool | Purpose | Data Source |
|------|---------|-------------|
| `search_courses` | Find USC courses by department, time, professor | Course database |
| `get_course_reviews` | Student reviews & ratings for specific courses | Supabase `course_reviews` |
| `recommend_courses` | Personalized course recs based on major, interests, peer reviews | Course data + `students` profile |
| `plan_schedule` | Build a semester schedule, check time conflicts | Course data + scheduling logic |

### Housing Tools

| Tool | Purpose | Data Source |
|------|---------|-------------|
| `search_sublets` | Find available sublets/housing by location, price, dates | Supabase `sublets` |
| `post_sublet` | List a sublet through George | Supabase `sublets` |

### Social Tools

| Tool | Purpose | Data Source |
|------|---------|-------------|
| `search_roommates` | Search existing roommate profiles | Supabase `roommate_profiles` |
| `suggest_connection` | Match students with similar interests/events | Supabase `students` + matching logic |

### Knowledge Tools

| Tool | Purpose | Data Source |
|------|---------|-------------|
| `campus_knowledge` | Study spots, food recs, campus tips, building info | RAG over curated knowledge base (pgvector) |
| `lookup_student` | Check student's profile, preferences, past attendance | Supabase `students` |

---

## 5. Data Model

### New Supabase Tables

- **`students`** — user profile, major, interests, notification preferences, platform IDs (WeChat OpenID, phone number for iMessage), past event attendance
- **`events`** — title, description, date, time, location, category, source (BIA/USC/Instagram/community), capacity, status, source_account (Instagram handle)
- **`event_submissions`** — community-submitted events pending BIA team review
- **`conversations`** — chat history per student for context continuity
- **`reminders`** — scheduled notifications per student per event
- **`course_reviews`** — BIA member course reviews and ratings
- **`sublets`** — housing listings from students

### Existing Tables (reuse)

- **`roommate_profiles`** — already exists in bia-roommate app

---

## 6. Data Pipeline & Event Sourcing

### Event Sources (4 tiers, priority order)

1. **BIA events** — BIA officers input directly via admin dashboard or Supabase Studio. George hypes these the hardest.
2. **Instagram scraping** — Curated list of influential USC club/org accounts (excluding USC CSSA and USC CU). Scheduled scraper (Apify) pulls recent posts. Claude Vision extracts event details from images + captions. BIA team manages the follow list.
3. **USC official events** — Automated scraper pulls from USC event calendars (USC Events, Viterbi, Marshall, etc.). Runs daily.
4. **Community-submitted** — Students submit events through George. Goes into pending queue for BIA team approval.

### Instagram Scraper Pipeline

```
Apify scheduled job (every few hours)
    → Pull recent posts from curated account list
    → Claude Vision: parse image + caption → extract event name, date, time, location
    → Deduplicate against existing events
    → Insert into `events` table with source = "instagram"
```

### Campus Knowledge Base

- Curated documents: study spots, food recs, building tips, campus shortcuts
- Stored as embeddings in Supabase pgvector for RAG retrieval
- Written with George's personality baked in ("Leavey三楼靠窗的位置是我最爱趴着的地方")

### Course Data

- Scraped from USC Schedule of Classes + Rate My Professor
- BIA member reviews stored in `course_reviews`
- Updated each semester

---

## 7. Platform Adapters

### WeChat — Official Account (服务号)

- Students follow BIA's WeChat Official Account and chat with George
- **Auth:** WeChat OpenID automatically identifies returning users
- **Notifications:** Template messages for event reminders (student-controlled frequency)
- **Rich messages:** Cards with event images, links, quick-reply buttons
- **Integration:** WeChat pushes messages via webhook → our server → Agent SDK → reply

### iMessage — via Sendblue

- Students text a dedicated phone number
- **Auth:** Phone number identifies the user
- **Rich messages:** Links, images, tapback reactions
- **Notifications:** George texts directly — feels native, like messaging a friend
- **Cost:** ~$0.01-0.05/msg — manageable at BIA's scale
- **Integration:** Sendblue webhook → our server → Agent SDK → reply via Sendblue API

### Shared Behavior

- Both adapters normalize messages into a common `{ userId, platform, text, timestamp }` format
- George's responses are platform-agnostic — adapters format for each platform
- Conversation history is shared across platforms per student (if they use both)

---

## 8. Notification System

- **Student-controlled:** Each student sets preferences for notification types and frequency
- **Options:** Event reminders, new event alerts, BIA announcements, social suggestions
- **Frequency:** Real-time, daily digest, weekly digest, or off — per category
- **Delivery:** Via the platform the student is active on (WeChat template message or iMessage)

---

## 9. V1 Rollout Plan (3 weeks)

### Week 1: Core Agent + WeChat

- Set up Supabase schema (all new tables)
- Build George agent with Agent SDK — personality system prompt, core tools (`search_events`, `get_event_details`, `campus_knowledge`, `lookup_student`)
- WeChat Official Account integration — webhook, message handling, user auth
- BIA team manually seeds initial event data
- **Milestone:** George is live on WeChat with event discovery + campus knowledge

### Week 2: iMessage + More Tools

- Sendblue iMessage adapter
- Add tools: `recommend_courses`, `search_courses`, `get_course_reviews`, `search_roommates`, `set_reminder`
- Instagram scraper (Apify + Claude Vision) — curated account list, auto-populate events
- Student notification preferences
- **Milestone:** George is live on iMessage, course tools working, events auto-populating

### Week 3: Social + Polish

- Add tools: `suggest_connection`, `submit_event`, `search_sublets`, `post_sublet`, `plan_schedule`
- USC event calendar scraper
- Admin dashboard for BIA team (manage events, Instagram follow list, review submissions)
- Testing, personality tuning, edge case handling
- **Milestone:** Full V1 shipped on both platforms

### V2 (future)

- More tools as BIA adds services
- Smart notification timing based on student behavior
- Rich preference learning over time
- Potentially more platforms
- George "memory" — remembers past conversations and preferences deeply
