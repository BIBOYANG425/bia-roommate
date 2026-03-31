# Account & Profile Redesign

## Summary

Merge the concepts of "account" and "roommate profile" into one thing. When a user signs up, they go through onboarding to create their profile. The account dashboard shows their profile (editable) plus saved schedules, liked profiles, and comments.

Add a like button to the profile modal and profile cards.

## Core Change

Account IS the roommate profile. One profile per account. The `/submit` page becomes the onboarding flow for new users. Existing anonymous profiles stay as-is until claimed.

## Onboarding Flow (post-signup)

After account creation, redirect to a stepped onboarding form:

1. **Step 1**: Name, School (USC/Berkeley/Stanford), Year, Major
2. **Step 2**: Avatar upload, Bio, Contact info
3. **Step 3**: Interest tags (same tag picker as current submit form)
4. **Step 4**: Habits (sleep, clean, noise, music, study) -- optional

- Same brutalist form styling as current submit page
- Creates `roommate_profiles` row with `user_id` set
- Skip button available (can complete later from dashboard)
- If user already has a linked profile (from the old anonymous flow), pre-populate

## Account Dashboard (`/account`)

### Top: Profile Card
- Full user profile display: avatar, name, school badge, year, major, bio, contact, tags
- "EDIT PROFILE" button opens inline editing or modal with the same form fields
- If no profile yet, show "COMPLETE YOUR PROFILE" CTA

### Below: 3 Collapsible Sections
Each is a brutalist card with header bar (title + count badge + chevron toggle):

1. **YOUR SAVED** -- saved course schedules, with delete
2. **YOUR LIKED** -- liked profiles (mini cards), with unlike
3. **YOUR COMMENTS** -- comments made on other profiles, with delete

### Stats Row
Between profile card and sections: 3 stat boxes showing saved/liked/comments counts.

### Mobile
Sections stack naturally. Stats wrap. Profile card is full-width.

## Profile Modal Changes

- Heart icon toggle in header bar, next to close button
- Filled red heart = liked, outline = not liked
- Clicking toggles via existing `POST /api/likes`
- Shows like count next to heart

## ProfileCard Changes

- Small heart icon + like count in footer next to timestamp
- Read-only display (clicking card still opens modal)

## Database Changes

None needed. Existing tables support everything:
- `roommate_profiles.user_id` links profile to account
- `profile_likes` tracks likes
- `profile_comments` tracks comments
- `saved_schedules` tracks schedules

## Files to Modify

- `app/account/page.tsx` -- full rewrite with card-based layout
- `components/ProfileModal.tsx` -- add like button
- `components/ProfileCard.tsx` -- add like count in footer
- `app/submit/page.tsx` -- convert to onboarding flow (stepped)
- `components/AuthModal.tsx` -- redirect to onboarding after signup
- `components/AuthProvider.tsx` -- possibly track profile completion state

## New Files

- `components/OnboardingFlow.tsx` -- stepped profile creation form
- `components/EditProfileModal.tsx` -- edit profile from dashboard (or inline)

## Out of Scope

- Comment UI on profiles (user chose like-only)
- Share/copy-link button
- Multiple profiles per account
- Profile verification/approval
