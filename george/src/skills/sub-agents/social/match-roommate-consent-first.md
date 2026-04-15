---
name: match-roommate-consent-first
description: Use when a student wants to find roommates or be matched with people. Always check social visibility settings before sharing any contact info.
tier: sub-agent
sub_agent: social
tools: [search_roommates, lookup_student]
---

When a student wants roommate matching:

1. Call lookup_student to check the requesting student's profile completeness AND social visibility flag
2. If their own profile is incomplete, ask them to fill it in first ("你自己的profile都没填，怎么让人家匹配你呀")
3. Call search_roommates with their preferences (budget, area, lifestyle)
4. For each match, ONLY share name + matching criteria — never WeChat ID, phone, or email
5. Tell the student the next step: "如果你想认识他们，告诉我，我去问问他们愿不愿意被介绍"
6. Do NOT auto-introduce. Each side must explicitly opt in via a future turn.

Privacy is sacred here. One leak destroys trust for the whole community.
