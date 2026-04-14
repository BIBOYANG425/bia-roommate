-- Consolidated schema: baseline + all 6 expansion features

create extension if not exists vector;

-- STUDENTS (with expansion fields)
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  wechat_open_id text unique,
  imessage_id text unique,
  name text,
  major text,
  year text,
  interests text[],
  notification_prefs jsonb default '{"events": true, "frequency": "daily"}'::jsonb,
  onboarding_complete boolean default false,
  referral_code text unique,
  referred_by uuid references students(id),
  referral_count int default 0,
  link_code text,
  link_code_expires_at timestamptz,
  last_active_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- MESSAGES (individual rows, replaces JSONB blob)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade not null,
  platform text not null check (platform in ('wechat', 'imessage')),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tool_calls jsonb,
  agent text,
  tokens_used int,
  created_at timestamptz default now()
);

-- EVENTS
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date timestamptz,
  end_date timestamptz,
  location text,
  category text,
  source text not null check (source in ('bia', 'usc', 'instagram', 'community')),
  source_url text,
  source_account text,
  image_url text,
  capacity int,
  status text default 'active' check (status in ('active', 'cancelled', 'past')),
  created_at timestamptz default now()
);

-- EVENT SUBMISSIONS
create table if not exists event_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  title text not null,
  description text,
  date timestamptz,
  location text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- REMINDERS
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  remind_at timestamptz not null,
  sent boolean default false,
  platform text check (platform in ('wechat', 'imessage')),
  created_at timestamptz default now()
);

-- SUBLETS
create table if not exists sublets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  title text not null,
  description text,
  location text,
  price_monthly int,
  available_from date,
  available_to date,
  contact text,
  status text default 'active' check (status in ('active', 'taken', 'expired')),
  created_at timestamptz default now()
);

-- CAMPUS KNOWLEDGE (RAG with pgvector)
create table if not exists campus_knowledge (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- STUDENT MEMORIES (long-term memory)
create table if not exists student_memories (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade not null,
  key text not null,
  value text not null,
  category text not null check (category in (
    'food_preference', 'academic_interest', 'social_preference',
    'mentioned_plan', 'personal_fact'
  )),
  last_referenced_at timestamptz default now(),
  created_at timestamptz default now()
);

-- EVENT ATTENDANCE (social graph)
create table if not exists event_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  source text default 'rsvp' check (source in ('rsvp', 'checkin', 'reminder')),
  created_at timestamptz default now(),
  unique(student_id, event_id)
);

-- STUDENT CONNECTIONS (social graph)
create table if not exists student_connections (
  id uuid primary key default gen_random_uuid(),
  student_a_id uuid references students(id) on delete cascade,
  student_b_id uuid references students(id) on delete cascade,
  source text default 'event' check (source in ('roommate', 'event', 'referral')),
  strength int default 1,
  created_at timestamptz default now(),
  unique(student_a_id, student_b_id)
);

-- PROACTIVE LOG
create table if not exists proactive_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  platform text check (platform in ('wechat', 'imessage')),
  status text default 'sent' check (status in ('sent', 'failed', 'skipped')),
  sent_at timestamptz default now()
);

-- INDEXES
create index idx_messages_student on messages(student_id, created_at desc);
create index idx_messages_agent on messages(agent);
create index idx_events_date on events(date);
create index idx_events_source on events(source);
create index idx_events_status on events(status);
create index idx_reminders_pending on reminders(remind_at) where sent = false;
create index idx_students_wechat on students(wechat_open_id);
create index idx_students_imessage on students(imessage_id);
create index idx_students_referral on students(referral_code);
create index idx_students_link_code on students(link_code) where link_code is not null;
create unique index idx_student_memories_key on student_memories(student_id, key);
create index idx_student_memories_student on student_memories(student_id, last_referenced_at desc);
create index idx_event_attendance_student on event_attendance(student_id);
create index idx_event_attendance_event on event_attendance(event_id);
create index idx_proactive_log_dedup on proactive_log(student_id, event_id);
create index idx_campus_knowledge_embedding on campus_knowledge
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
