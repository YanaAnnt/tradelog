-- TradeLog database schema
-- Run this in Supabase: SQL Editor -> paste -> Run

------------------------------------------------------------------
-- 1. PROFILES: one row per signed-up user
------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  currency text not null default 'USD',
  theme text not null default 'dark',
  starting_balance numeric not null default 0,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------------
-- 2. BROKER_CONNECTIONS: per-user broker credentials
-- (Token stored encrypted in Phase 2; plain text now for v1 simplicity,
--  protected by RLS so only the owner reads it.)
------------------------------------------------------------------
create table public.broker_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  broker text not null default 'IBKR',
  token text not null,
  query_id text not null,
  last_sync_at timestamptz,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (user_id, broker)
);

alter table public.broker_connections enable row level security;

create policy "Users manage their own broker connections"
  on public.broker_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------------
-- 3. TRADES: every closed trade
------------------------------------------------------------------
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  broker_trade_id text,                       -- nullable; from IBKR Flex when present
  date date not null,
  symbol text not null,
  side text not null check (side in ('Long', 'Short')),
  qty numeric,
  entry numeric,
  exit numeric,
  fees numeric not null default 0,
  pnl numeric not null,
  strategy text,
  source text not null default 'manual',      -- 'manual' | 'import' | 'sync'
  created_at timestamptz not null default now()
);

create index trades_user_date_idx on public.trades (user_id, date);
create unique index trades_user_brokerid_idx on public.trades (user_id, broker_trade_id) where broker_trade_id is not null;

alter table public.trades enable row level security;

create policy "Users manage their own trades"
  on public.trades for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------------
-- 4. DAY_TAGS: per-day strategy/method tag (for the calendar)
------------------------------------------------------------------
create table public.day_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  strategy text,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.day_tags enable row level security;

create policy "Users manage their own day tags"
  on public.day_tags for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

------------------------------------------------------------------
-- 5. SYNC_RUNS: audit trail of broker sync attempts (used in Phase 2)
------------------------------------------------------------------
create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',     -- 'running' | 'success' | 'error'
  n_trades integer,
  error text
);

alter table public.sync_runs enable row level security;

create policy "Users read their own sync runs"
  on public.sync_runs for select
  using (auth.uid() = user_id);
