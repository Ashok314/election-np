-- Election Results table: one row per candidate per constituency
-- Upserted on every scrape using (dist_id, const_id, candidate_id) as the unique key

create table if not exists public.election_results (
  id              bigint generated always as identity primary key,
  dist_id         integer not null,
  const_id        integer not null,
  candidate_id    integer,
  candidate_name  text,
  party_name      text,
  party_id        integer,
  symbol_name     text,
  gender          text,
  age             integer,
  votes           integer default 0,
  remarks         text,        -- 'Elected' | 'निर्वाचित' | null (leading)
  state_name      text,
  district_name   text,
  scraped_at      timestamptz default now(),
  unique (dist_id, const_id, candidate_id)
);

-- Enable Row Level Security, but allow anon reads (public election data)
alter table public.election_results enable row level security;

create policy "Public read access"
  on public.election_results
  for select using (true);

-- Enable Realtime on this table
alter publication supabase_realtime add table public.election_results;

-- Index for fast filtered lookups
create index if not exists idx_election_dist_const on public.election_results (dist_id, const_id);
create index if not exists idx_election_party on public.election_results (party_name);
create index if not exists idx_election_remarks on public.election_results (remarks);

ALTER TABLE election_results ADD CONSTRAINT unique_candidate_per_constituency UNIQUE (dist_id, const_id, candidate_name);
