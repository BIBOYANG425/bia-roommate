create table if not exists apartment_votes (
  id uuid primary key default gen_random_uuid(),
  apartment_id text not null,
  vote text not null check (vote in ('up', 'down')),
  voter_fingerprint text not null,
  created_at timestamptz default now(),
  constraint apartment_votes_unique unique (apartment_id, voter_fingerprint)
);

create index if not exists idx_apartment_votes_apt on apartment_votes (apartment_id);

alter table apartment_votes enable row level security;

create policy "anyone can read votes"
  on apartment_votes for select using (true);

create policy "anyone can upsert votes"
  on apartment_votes for insert with check (true);

create policy "owner can delete own vote"
  on apartment_votes for delete using (true);
