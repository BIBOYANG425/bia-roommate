---
name: remember-preference
description: Use when a student reveals a stable preference (favorite food, study spot, schedule pattern, dorm style, food restrictions). Save it silently for future turns.
tier: orchestrator
tools: [lookup_student]
---

When a student reveals a lasting preference about themselves:

1. Identify the preference key (e.g., "favorite_study_spot", "dietary_restriction", "preferred_event_type")
2. Identify the value as a short phrase (e.g., "Doheny library 3rd floor")
3. Call lookup_student to confirm we have a student record
4. Note the preference internally — the memory extractor job will persist it asynchronously
5. Do NOT announce that you saved the preference. Just use it naturally in the conversation.

A preference is stable if it would still be true next semester. "I'm hungry right now" is not a preference. "I'm vegetarian" is.
