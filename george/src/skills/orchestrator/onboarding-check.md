---
name: onboarding-check
description: Use when a student tries to use event/course/housing/social features but hasn't completed onboarding. Politely redirect them to onboarding first.
tier: orchestrator
tools: [lookup_student, update_profile]
---

If a student is mid-conversation about events, courses, housing, or social matching, but their `onboarding_complete` is false:

1. Call `lookup_student` to confirm onboarding status and see which fields are already filled in.
2. If still incomplete, redirect playfully: "等等等等！我连你叫什么专业都不知道呢，先告诉我点关于你的事吧🐕"
3. Run through the onboarding questions ONE AT A TIME (never all at once), asking only the field(s) that are still missing:
   - **major** (e.g. "Computer Science", "Business")
   - **year** (one of: freshman, sophomore, junior, senior, grad)
   - **interests** (3–5 tags like ["AI", "music", "basketball"])
   - **notification_frequency** (one of: daily, weekly, special_only)
4. **Save AFTER EVERY answer.** As soon as the student replies with one field, immediately call `update_profile` with just that field. Do NOT batch up answers — partial saves protect us if the student disappears mid-flow. The tool returns `missing` so you know what to ask next.
5. **Retry cap:** if the student dodges or refuses the SAME question more than 2 times, save a placeholder via `update_profile` and move on:
   - major → `"undecided"`
   - year → `"unknown"`
   - interests → `["unknown"]`
   - notification_frequency → `"weekly"`
6. When `update_profile` returns `complete: true`, the tool already marked the database row done. Just congratulate the student in George's style and tell them what they can now do (events, courses, housing, social), then return to their original request. Do NOT call the tool again.

Never silently skip onboarding. The whole personalization layer depends on having student profile data — but never let a stuck student get stuck forever either. The retry cap exists for a reason.
