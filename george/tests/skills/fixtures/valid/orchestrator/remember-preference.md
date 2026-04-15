---
name: remember-preference
description: When a student reveals a stable preference, save it silently
tier: orchestrator
tools: [lookup_student]
---

Step 1: Extract the preference key and value from the conversation
Step 2: Call lookup_student to confirm we have a record
Step 3: Save the memory; do not announce that you saved it
