# Account & Profile Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge account and roommate profile into one concept, add post-signup onboarding, redesign the account dashboard with collapsible sections, and add like buttons to profile cards and modals.

**Architecture:** Account IS the profile. After signup, users hit a stepped onboarding to create their `roommate_profiles` row. The `/account` page shows their profile card (editable) plus 3 collapsible sections (saved/liked/comments). Like counts are fetched as aggregates from `profile_likes` and displayed on cards and modals.

**Tech Stack:** Next.js App Router, Supabase (auth + DB), React state, Tailwind CSS, brutalist design system (CSS vars: --cardinal, --gold, --cream, --black, --mid)

---

## Task 1: Add Like Count API Endpoint

**Files:**

- Create: `app/api/likes/count/route.ts`

**Step 1: Create the like count endpoint**

```typescript
// app/api/likes/count/route.ts
import { NextResponse } from "next/server";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileIds = searchParams.get("ids")?.split(",").filter(Boolean);

  if (!profileIds || profileIds.length === 0) {
    return NextResponse.json({});
  }

  // Get like counts per profile
  const { data, error } = await supabase
    .from("profile_likes")
    .select("profile_id")
    .in("profile_id", profileIds);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.profile_id] = (counts[row.profile_id] || 0) + 1;
  }

  return NextResponse.json(counts);
}
```

**Step 2: Verify it works**

Run: `curl http://localhost:3000/api/likes/count?ids=some-id`
Expected: `{}` (empty since no likes yet)

**Step 3: Commit**

```bash
git add app/api/likes/count/route.ts
git commit -m "feat: add like count API endpoint"
```

---

## Task 2: Add Like Button to ProfileModal

**Files:**

- Modify: `components/ProfileModal.tsx`

**Step 1: Add like state and toggle logic**

Add imports and state at top of `ProfileModal` component:

```typescript
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthProvider";
```

Inside the component, after existing `useEffect`:

```typescript
const { user } = useAuth();
const [liked, setLiked] = useState(false);
const [likeCount, setLikeCount] = useState(0);
const [likeLoading, setLikeLoading] = useState(false);

useEffect(() => {
  // Fetch like count and user's like status
  async function fetchLikeData() {
    const res = await fetch(`/api/likes/count?ids=${profile.id}`);
    const counts = await res.json();
    setLikeCount(counts[profile.id] || 0);

    if (user) {
      const { createBrowserSupabaseClient } =
        await import("@/lib/supabase/client");
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from("profile_likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("profile_id", profile.id)
        .maybeSingle();
      setLiked(!!data);
    }
  }
  fetchLikeData();
}, [profile.id, user]);

const handleLike = useCallback(async () => {
  if (!user || likeLoading) return;
  setLikeLoading(true);
  const res = await fetch("/api/likes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile_id: profile.id }),
  });
  const data = await res.json();
  setLiked(data.liked);
  setLikeCount((prev) => (data.liked ? prev + 1 : Math.max(0, prev - 1)));
  setLikeLoading(false);
}, [user, profile.id, likeLoading]);
```

**Step 2: Add heart button in the modal header**

In the header div (the one with `style={{ background: accent }}`), add next to the close button:

```tsx
{
  /* Like button */
}
<button
  onClick={(e) => {
    e.stopPropagation();
    handleLike();
  }}
  disabled={!user || likeLoading}
  className="absolute top-4 right-16 w-10 h-10 flex items-center justify-center border-[3px] border-[var(--black)] z-10 font-display text-lg transition-colors"
  style={{
    background: liked ? "var(--cardinal)" : "var(--cream)",
    color: liked ? "white" : "var(--black)",
    cursor: user ? "pointer" : "not-allowed",
  }}
  title={user ? (liked ? "Unlike" : "Like") : "Sign in to like"}
>
  {liked ? "♥" : "♡"}
</button>;
```

Add like count display below the close/like buttons area, inside the header content:

```tsx
{
  likeCount > 0 && (
    <span className="text-[10px] text-white/60 uppercase tracking-wider mt-1">
      {likeCount} {likeCount === 1 ? "like" : "likes"}
    </span>
  );
}
```

**Step 3: Test manually**

1. Open a profile modal — heart button should appear
2. Click heart when logged in — should toggle filled/outline
3. Count should update

**Step 4: Commit**

```bash
git add components/ProfileModal.tsx
git commit -m "feat: add like button to profile modal"
```

---

## Task 3: Add Like Count to ProfileCard

**Files:**

- Modify: `components/ProfileCard.tsx`
- Modify: `app/page.tsx`

**Step 1: Add `likeCount` prop to ProfileCard**

In `ProfileCard.tsx`, update the props interface:

```typescript
export default function ProfileCard({
  profile,
  onClick,
  likeCount,
}: {
  profile: RoommateProfile
  onClick: () => void
  likeCount?: number
}) {
```

In the footer div (the one with `border-t-[2px]`), add heart + count before the timestamp:

```tsx
{
  (likeCount ?? 0) > 0 && (
    <span
      className="text-[10px] flex items-center gap-1"
      style={{ color: "var(--cardinal)" }}
    >
      ♥ {likeCount}
    </span>
  );
}
```

**Step 2: Fetch like counts on home page**

In `app/page.tsx`, after profiles are fetched, add a second fetch for like counts:

```typescript
const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

// Inside the useEffect after setProfiles:
if (data && data.length > 0) {
  const ids = data.map((p: RoommateProfile) => p.id).join(",");
  fetch(`/api/likes/count?ids=${ids}`)
    .then((r) => r.json())
    .then(setLikeCounts)
    .catch(() => {});
}
```

Pass to each card:

```tsx
<ProfileCard
  key={profile.id}
  profile={profile}
  onClick={() => setSelectedProfile(profile)}
  likeCount={likeCounts[profile.id]}
/>
```

**Step 3: Test manually**

Home page should show heart + count on cards that have likes.

**Step 4: Commit**

```bash
git add components/ProfileCard.tsx app/page.tsx
git commit -m "feat: show like counts on profile cards"
```

---

## Task 4: Create Onboarding Flow Component

**Files:**

- Create: `components/OnboardingFlow.tsx`

**Step 1: Build the stepped onboarding form**

This reuses form logic from `app/submit/page.tsx` but as a 4-step wizard. Key differences:

- Always sets `user_id` (user is authenticated)
- Checks for existing profile first (pre-populate if found)
- Skip button on every step
- Redirect to `/account` on completion

```typescript
// components/OnboardingFlow.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  VALID_TAGS,
  SLEEP_OPTIONS,
  CLEAN_OPTIONS,
  NOISE_OPTIONS,
  MUSIC_OPTIONS,
  STUDY_OPTIONS,
  SCHOOL_OPTIONS,
  YEAR_OPTIONS,
  ENROLLMENT_OPTIONS,
} from "@/lib/types";
```

4 steps:

- Step 1: Name, School (radio), Year (radio), Major (text input)
- Step 2: Avatar URL (text input for now), Bio (textarea), Contact (text input)
- Step 3: Tag picker (same grid as submit page, max 6)
- Step 4: Habits — RadioGroup components for sleep, clean, noise, music, study. All optional.

Each step shows NEXT / BACK / SKIP buttons. Skip goes to `/account`.

On final step submit: `supabase.from('roommate_profiles').insert(...)` with `user_id: user.id`, then redirect to `/account`.

If existing profile found: `supabase.from('roommate_profiles').update(...)` instead.

Full component is ~250 lines. Follow the same brutalist styling patterns from `app/submit/page.tsx` (brutal-input, brutal-tag, RadioGroup pattern, school-color header).

**Step 2: Commit**

```bash
git add components/OnboardingFlow.tsx
git commit -m "feat: add stepped onboarding flow component"
```

---

## Task 5: Create Onboarding Page Route

**Files:**

- Create: `app/onboarding/page.tsx`

**Step 1: Create the route**

```typescript
// app/onboarding/page.tsx
import OnboardingFlow from '@/components/OnboardingFlow'

export default function OnboardingPage() {
  return <OnboardingFlow />
}
```

**Step 2: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "feat: add onboarding page route"
```

---

## Task 6: Redirect to Onboarding After Signup

**Files:**

- Modify: `components/AuthModal.tsx`

**Step 1: Add post-signup redirect**

In `AuthModal.tsx`, modify the success handler (around line 54-59). After successful signup, if there's no custom `onSuccess`, redirect to `/onboarding`:

```typescript
if (err) {
  setError(err);
} else {
  setSuccess(true);
  if (onSuccess) {
    onSuccess();
  } else if (mode === "signup") {
    // New users go to onboarding
    setTimeout(() => {
      window.location.href = "/onboarding";
    }, 500);
  } else {
    // Sign in — just close
    setTimeout(() => handleClose(), 500);
  }
}
```

**Step 2: Test manually**

1. Sign up with a new school email
2. Should redirect to `/onboarding` after account creation
3. Existing sign-in flow should still close modal

**Step 3: Commit**

```bash
git add components/AuthModal.tsx
git commit -m "feat: redirect to onboarding after signup"
```

---

## Task 7: Redesign Account Dashboard

**Files:**

- Rewrite: `app/account/page.tsx`

**Step 1: Full rewrite with card-based layout**

New layout:

1. Back button
2. **Profile card** at top — full-width brutalist card showing all profile data. "EDIT PROFILE" button. If no profile: "COMPLETE YOUR PROFILE" CTA linking to `/onboarding`.
3. **Stats row** — 3 brutalist boxes: X Saved, X Liked, X Comments
4. **3 collapsible sections** — each with header (title + count + chevron), body toggles open/close

Key implementation details:

- Fetch profile: `supabase.from('roommate_profiles').select('*').eq('user_id', user.id).maybeSingle()`
- Fetch counts in parallel with profile data
- Collapsible sections use `useState<Record<string, boolean>>` for open/close state
- Default all sections expanded
- Edit button opens `/onboarding` (reuses same form, pre-populated)

Profile card shows:

- Avatar (or initial badge with school accent)
- Name (display font, large)
- School badge image + school/year/major/gender line
- Bio text
- Contact in gold box
- Tags
- "EDIT PROFILE" button (links to `/onboarding`)

Collapsible section component:

```tsx
function CollapsibleSection({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="border-[3px] border-[var(--black)]"
      style={{ background: "var(--cream)" }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 font-display text-sm tracking-wider"
        style={{ color: "var(--black)" }}
      >
        <span>{title}</span>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 text-[10px] border-[2px] border-[var(--black)]"
            style={{ background: "var(--gold)" }}
          >
            {count}
          </span>
          <span
            style={{
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          >
            ▼
          </span>
        </div>
      </button>
      {open && (
        <div className="p-4 pt-0 border-t-[2px] border-[var(--black)]">
          {children}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Test manually**

1. Navigate to `/account` when logged in
2. Profile card should show user's profile (or CTA if none)
3. Stats row shows counts
4. Sections expand/collapse
5. Delete/unlike actions work

**Step 3: Commit**

```bash
git add app/account/page.tsx
git commit -m "feat: redesign account dashboard with collapsible sections"
```

---

## Task 8: Update NavTabs for Account Link

**Files:**

- Modify: `components/NavTabs.tsx`

**Step 1: Ensure ACCOUNT link is visible**

Already done in prior work. Verify the ACCOUNT button links to `/account` and highlights when active. No changes needed if it already works.

**Step 2: Commit (if changes made)**

---

## Task 9: Update Submit Page to Check for Existing Profile

**Files:**

- Modify: `app/submit/page.tsx`

**Step 1: Add check for authenticated users with profiles**

At the top of the SubmitPage component, after auth check:

```typescript
useEffect(() => {
  if (user) {
    // If logged in and already has a profile, redirect to account
    const supabase = createBrowserSupabaseClient();
    supabase
      .from("roommate_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          router.push("/account");
        }
      });
  }
}, [user, router]);
```

This prevents logged-in users with profiles from creating duplicates. They get sent to `/account` where they can edit instead.

**Step 2: Commit**

```bash
git add app/submit/page.tsx
git commit -m "feat: redirect logged-in users with profiles to account"
```

---

## Task 10: Final Integration Test

**Step 1: Test full flow end-to-end**

1. Sign up with new school email → redirects to `/onboarding`
2. Complete onboarding steps → profile created, redirects to `/account`
3. Account dashboard shows profile card, stats, collapsible sections
4. Click "EDIT PROFILE" → goes to `/onboarding` with pre-populated data
5. Home page shows like counts on cards
6. Open profile modal → heart button works, toggles like
7. Account dashboard "YOUR LIKED" section shows liked profiles
8. Anonymous submit flow still works for non-authenticated users

**Step 2: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes for account/profile redesign"
```

---

## Summary of Files

| Action  | File                            | Purpose                                        |
| ------- | ------------------------------- | ---------------------------------------------- |
| Create  | `app/api/likes/count/route.ts`  | Like count aggregation endpoint                |
| Create  | `components/OnboardingFlow.tsx` | Stepped profile creation form                  |
| Create  | `app/onboarding/page.tsx`       | Onboarding page route                          |
| Rewrite | `app/account/page.tsx`          | Card-based dashboard with collapsible sections |
| Modify  | `components/ProfileModal.tsx`   | Add heart like button                          |
| Modify  | `components/ProfileCard.tsx`    | Show like count in footer                      |
| Modify  | `app/page.tsx`                  | Fetch and pass like counts                     |
| Modify  | `components/AuthModal.tsx`      | Redirect to onboarding after signup            |
| Modify  | `app/submit/page.tsx`           | Redirect logged-in users with profiles         |
