-- Phase 3.2: extend student_memories categories to capture course-planning state
-- (completed courses, GE progress, units/prof/time preferences). These categories
-- close the "George doesn't remember academic state between sessions" complaint
-- by giving extraction a structured slot for each fact.
--
-- The original CHECK constraint is dropped and rebuilt with the superset.

alter table student_memories
  drop constraint if exists student_memories_category_check;

alter table student_memories
  add constraint student_memories_category_check
  check (category in (
    'food_preference',
    'academic_interest',
    'social_preference',
    'mentioned_plan',
    'personal_fact',
    -- Course-planning intake (new in Phase 3.2):
    'completed_course',
    'ge_completed',
    'units_preference',
    'prof_bar',
    'time_preference'
  ));
