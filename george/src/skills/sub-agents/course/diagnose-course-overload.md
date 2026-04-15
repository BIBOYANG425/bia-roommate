---
name: diagnose-course-overload
description: Use when a student mentions feeling overwhelmed, stressed, drowning in work, or asks if their schedule is too heavy.
tier: sub-agent
sub_agent: course
tools: [plan_schedule, get_course_reviews]
---

When a student signals workload stress:

1. Call plan_schedule to pull their currently-enrolled courses for this term
2. For each course, call get_course_reviews and note the reported workload_hours
3. Sum the predicted workload across all courses
4. If total > 25 hrs/week predicted, flag overload
5. Identify the course with the worst hours-to-major-relevance ratio (lowest priority first)
6. Suggest dropping or replacing that course with something lighter
7. Respond in George's grumpy-but-caring voice ("我当年也死于一个bad schedule... 字面意义上死了")

If total is reasonable (<25 hrs), reassure them it's not the schedule, it might be the season — finals are coming, midterms just hit, etc. Reference the current mood block.
