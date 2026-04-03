-- Squad posts table for 找搭子 feature
create table if not exists squad_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  poster_name text not null,
  avatar_url text,
  school text,
  category text not null check (category in ('拼车', '自习', '约会', '健身', '游戏', '其它')),
  content text not null,
  photos text[],
  location text,
  max_people int not null default 2 check (max_people >= 2),
  current_people int not null default 1 check (current_people >= 1),
  deadline timestamptz,
  gender_restriction text not null default '不限' check (gender_restriction in ('不限', '仅男生', '仅女生')),
  contact text,
  created_at timestamptz default now()
);

-- Squad members table (tracks who has joined a post)
create table if not exists squad_members (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references squad_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique(post_id, user_id)
);

-- RLS
alter table squad_posts enable row level security;
alter table squad_members enable row level security;

create policy "Squad posts viewable by all"
  on squad_posts for select using (true);

create policy "Auth users can create squad posts"
  on squad_posts for insert with check (auth.uid() = user_id);

create policy "Squad members viewable by all"
  on squad_members for select using (true);

create policy "Auth users can join squad posts"
  on squad_members for insert with check (auth.uid() = user_id);

create policy "Auth users can leave squad posts"
  on squad_members for delete using (auth.uid() = user_id);

-- Index for faster category + time queries
create index if not exists idx_squad_posts_category on squad_posts(category);
create index if not exists idx_squad_posts_created_at on squad_posts(created_at desc);
create index if not exists idx_squad_members_post_user on squad_members(post_id, user_id);
