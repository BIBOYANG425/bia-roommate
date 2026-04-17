-- WeChat-distilled knowledge for George's sub-agents.
-- freshman_faq: Q/A pairs extracted from senior-to-freshman exchanges in the BIA 2024 group.
-- course_tips: course and professor tips distilled from the same group.
-- Both use pgvector embeddings for semantic retrieval.

create extension if not exists vector;

create table if not exists freshman_faq (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null check (category in ('housing', 'academics', 'social', 'admin', 'food', 'general')),
  source_thread_id text,
  confidence numeric default 0.8,
  embedding vector(1536),
  created_at timestamptz default now()
);

create index if not exists idx_freshman_faq_embedding on freshman_faq
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists idx_freshman_faq_category on freshman_faq(category);

create table if not exists course_tips (
  id uuid primary key default gen_random_uuid(),
  course_code text,
  professor text,
  tip text not null,
  sentiment text check (sentiment in ('positive', 'mixed', 'negative')),
  source_thread_id text,
  embedding vector(1536),
  created_at timestamptz default now()
);

create index if not exists idx_course_tips_embedding on course_tips
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists idx_course_tips_course on course_tips(course_code);

alter table freshman_faq enable row level security;
alter table course_tips enable row level security;

-- RLS read policies.
-- Both tables hold PII-free, community-sourced content (senior-to-freshman Q&A
-- and course tips). Same access posture as campus_knowledge in 001: any client
-- the tools use should be able to read. george's tools talk to supabase via the
-- service_role key (see src/db/client.ts), which bypasses RLS; these policies
-- exist so that anon / authenticated roles (e.g. any future client-side reads
-- or Supabase Studio browsing) also get read access. Writes stay restricted to
-- the service role — the ingest pipeline is server-side only.
create policy "freshman_faq is world-readable"
  on freshman_faq for select
  using (true);

create policy "course_tips is world-readable"
  on course_tips for select
  using (true);
