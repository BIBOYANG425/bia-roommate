-- Courses & programs catalog tables (USC catalogue.usc.edu ingest)
-- Structured storage for George's course/program tools. Free-text RAG for
-- programs/schools lives in campus_knowledge (mirrored). Courses stay structured
-- only to avoid diluting RAG with 13k formulaic rows.

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  coid text unique not null,
  dept text not null,
  code text not null,
  title text not null,
  description text,
  units text,
  terms text,
  prereq text,
  corequisite text,
  recommended_prep text,
  restriction text,
  mode text,
  grading text,
  crosslisted text,
  source_url text not null,
  embedding vector(1536),
  scraped_at timestamptz default now()
);

create index if not exists idx_courses_dept_code on courses(dept, code);
create index if not exists idx_courses_embedding on courses
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  poid text unique not null,
  name text not null,
  degree_type text,
  school text,
  description text,
  required_courses text[],
  source_url text not null,
  embedding vector(1536),
  scraped_at timestamptz default now()
);

create index if not exists idx_programs_school on programs(school);
create index if not exists idx_programs_degree_type on programs(degree_type);
create index if not exists idx_programs_embedding on programs
  using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- RLS: service role only (george writes, tools read via service role key)
alter table courses enable row level security;
alter table programs enable row level security;
