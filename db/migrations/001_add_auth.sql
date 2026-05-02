-- Run this migration in your Supabase SQL editor (or psql).
-- It is safe to run multiple times (uses IF NOT EXISTS / IF EXISTS guards).

-- 1. Link visa_submissions to auth users (nullable to preserve existing rows).
alter table public.visa_submissions
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists visa_submissions_user_id_created_at_idx
  on public.visa_submissions (user_id, created_at desc);

-- Composite index improves the free-tier usage count query.
create index if not exists visa_submissions_user_id_month_idx
  on public.visa_submissions (user_id, date_trunc('month', created_at));

-- 2. Subscription tracking table.
create table if not exists public.user_subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  plan                   text not null default 'free',   -- 'free' | 'pro'
  status                 text not null default 'active', -- 'active' | 'canceled' | 'past_due'
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Trigger to keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_subscriptions_updated_at on public.user_subscriptions;
create trigger user_subscriptions_updated_at
  before update on public.user_subscriptions
  for each row execute procedure public.set_updated_at();
