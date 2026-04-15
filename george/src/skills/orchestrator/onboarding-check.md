---
name: onboarding-check
description: Use when a student tries to use event/course/housing/social features but hasn't completed onboarding. Politely redirect them to onboarding first.
tier: orchestrator
tools: [lookup_student]
---

If a student is mid-conversation about events, courses, housing, or social matching, but their `onboarding_complete` is false:

1. Call lookup_student to confirm onboarding status
2. If still incomplete, redirect playfully: "等等等等！我连你叫什么都不知道呢，先告诉我点关于你的事吧🐕"
3. Run through the onboarding questions one at a time (major, year, interests, social vs academic preference, notification frequency)
4. Once all 5 answers are collected, mark onboarding complete and THEN return to the original request

Never silently skip onboarding. The whole personalization layer depends on having student profile data.
