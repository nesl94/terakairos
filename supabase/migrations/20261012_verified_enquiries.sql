create extension if not exists pgcrypto;

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','verified','delivered','delivery_failed')),
  email text,
  email_normalized text,
  service text,
  country text,
  dob date,
  message text,
  token_hash text not null unique,
  token_expires_at timestamptz not null,
  verification_sent_at timestamptz,
  verified_at timestamptz,
  delivered_at timestamptz,
  request_fingerprint text
);

create index if not exists enquiries_email_created_idx
  on public.enquiries (email_normalized, created_at desc);
create index if not exists enquiries_fingerprint_created_idx
  on public.enquiries (request_fingerprint, created_at desc);
create index if not exists enquiries_status_expiry_idx
  on public.enquiries (status, token_expires_at);

alter table public.enquiries enable row level security;
revoke all on table public.enquiries from anon, authenticated;

-- Run this manually from time to time, or schedule it with Supabase Cron.
-- It removes stale unverified submissions and old scrubbed delivery records.
create or replace function public.purge_stale_enquiries()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.enquiries
  where (status = 'pending' and token_expires_at < now() - interval '24 hours')
     or (status in ('delivered','delivery_failed') and created_at < now() - interval '7 days');
$$;
