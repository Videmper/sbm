-- Initial modernization delta for existing deployments.
-- If you are setting up from scratch, use ../fullupdate.sql instead.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.member_balance_transfers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  source_bucket text not null default 'multiplier' check (source_bucket in ('mandatory', 'mandatory_shares', 'multiplier', 'withdrawable', 'rounded_bucket')),
  destination_bucket text not null default 'withdrawable' check (destination_bucket in ('mandatory', 'mandatory_shares', 'multiplier', 'withdrawable', 'rounded_bucket')),
  amount numeric(12, 2) not null,
  transfer_date date not null default current_date,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_historical_allocations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients (id) on delete cascade,
  is_active boolean not null default true,
  total_contributions_override numeric(12, 2),
  registration_fee_deducted boolean not null default true,
  membership_fee_deducted boolean not null default true,
  sticker_fee_deducted boolean not null default true,
  monthly_subscription_mode text not null default 'apply' check (monthly_subscription_mode in ('apply', 'waive', 'defer')),
  annual_subscription_mode text not null default 'apply' check (annual_subscription_mode in ('apply', 'waive', 'defer')),
  manual_adjustment_amount numeric(12, 2) not null default 0,
  opening_rounded_bucket numeric(12, 2) not null default 0,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_historical_allocation_loans (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.client_historical_allocations (id) on delete cascade,
  cycle_number integer not null default 1,
  loan_amount numeric(12, 2) not null default 0,
  loan_period_days integer not null default 30,
  daily_savings_amount numeric(12, 2) not null default 50,
  category text,
  missed_days integer not null default 0,
  penalty_amount numeric(12, 2) not null default 0,
  is_defaulted boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.platform_fees (
  id uuid primary key default gen_random_uuid(),
  fee_name text not null,
  amount numeric(12, 2) not null default 0,
  effective_date date not null,
  scope_mode text not null default 'all_members' check (scope_mode in ('all_members', 'current_members_only', 'future_members_only')),
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.loan_payment_breakdowns (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  repayment_id uuid references public.repayments (id) on delete set null,
  payment_date date not null,
  receipt_number text,
  payment_method text,
  source_channel text not null default 'manual' check (source_channel in ('manual', 'legacy_sync', 'mpesa', 'cash', 'bank', 'multiplier_redirect')),
  total_amount numeric(12, 2) not null default 0,
  loan_amount numeric(12, 2) not null default 0,
  savings_amount numeric(12, 2) not null default 0,
  rounded_bucket_amount numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.purpose_pool_allocations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  loan_id uuid references public.loans (id) on delete set null,
  receipt_number text,
  transaction_date date not null,
  category_code text not null check (category_code in ('levies_permits', 'biashara_boost', 'welfare_fund', 'legal_fund', 'operation_admin')),
  category_label text not null,
  percentage numeric(5, 4) not null default 0,
  amount numeric(12, 2) not null default 0,
  source_channel text not null default 'multiplier_redirect' check (source_channel in ('manual', 'legacy_sync', 'mpesa', 'cash', 'bank', 'multiplier_redirect')),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_visit_locations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  loan_id uuid references public.loans (id) on delete set null,
  officer_id uuid references public.profiles (id) on delete set null,
  location_type text not null default 'business' check (location_type in ('home', 'business', 'live')),
  source_type text not null default 'field_visit' check (source_type in ('field_visit', 'member_confirmation', 'browser', 'manual')),
  latitude numeric(10, 8) not null,
  longitude numeric(11, 8) not null,
  location_description text,
  landmark_description text,
  house_color text,
  business_type text,
  appraisal_notes text,
  photo_path text,
  visited_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_live_locations (
  client_id uuid primary key references public.clients (id) on delete cascade,
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  accuracy numeric(10, 2),
  status text not null default 'offline' check (status in ('online', 'offline', 'denied', 'stale')),
  permission_state text,
  source text default 'browser',
  last_error text,
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  run_mode text not null default 'incremental' check (run_mode in ('full', 'incremental', 'callback')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  source_name text,
  records_seen integer not null default 0,
  records_written integer not null default 0,
  details text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz
);

create table if not exists public.legacy_transaction_sync (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id text not null,
  receipt_number text not null unique,
  client_id uuid references public.clients (id) on delete set null,
  amount numeric(12, 2) not null default 0,
  transaction_date date,
  sync_mode text not null default 'incremental' check (sync_mode in ('full', 'incremental', 'callback')),
  synced_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  unique (source_table, source_id)
);

create table if not exists public.mpesa_callback_logs (
  id uuid primary key default gen_random_uuid(),
  merchant_request_id text,
  checkout_request_id text,
  result_code integer,
  result_desc text,
  raw_payload jsonb not null,
  processed boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpesa_transactions (
  id uuid primary key default gen_random_uuid(),
  callback_log_id uuid references public.mpesa_callback_logs (id) on delete set null,
  merchant_request_id text,
  checkout_request_id text,
  mpesa_receipt_number text unique,
  result_code integer,
  result_desc text,
  amount numeric(12, 2),
  payer_phone text,
  bill_ref_number text,
  account_reference text,
  business_shortcode text,
  transaction_date text,
  status text not null default 'success' check (status in ('success', 'pending', 'failed', 'reversed')),
  matched_client_id uuid references public.clients (id) on delete set null,
  matched_loan_id uuid references public.loans (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop view if exists public.member_portfolio_balances;
create view public.member_portfolio_balances as
select
  c.id as client_id,
  c.member_no,
  c.full_name,
  coalesce(sum(case when s.savings_bucket = 'mandatory' and s.transaction_type in ('deposit', 'adjustment') then s.amount
                    when s.savings_bucket = 'mandatory' and s.transaction_type in ('withdrawal', 'transfer') then -s.amount
                    else 0 end), 0) as mandatory_savings,
  coalesce(sum(case when s.savings_bucket = 'mandatory_shares' and s.transaction_type in ('deposit', 'adjustment') then s.amount
                    when s.savings_bucket = 'mandatory_shares' and s.transaction_type in ('withdrawal', 'transfer') then -s.amount
                    else 0 end), 0) as mandatory_shares,
  coalesce(sum(case when s.savings_bucket = 'multiplier' and s.transaction_type in ('deposit', 'adjustment') then s.amount
                    when s.savings_bucket = 'multiplier' and s.transaction_type in ('withdrawal', 'transfer') then -s.amount
                    else 0 end), 0) as multiplier_balance,
  coalesce(sum(case when s.savings_bucket = 'withdrawable' and s.transaction_type in ('deposit', 'adjustment') then s.amount
                    when s.savings_bucket = 'withdrawable' and s.transaction_type in ('withdrawal', 'transfer') then -s.amount
                    else 0 end), 0) as withdrawable_balance
from public.clients c
left join public.savings_ledger s on s.client_id = c.id
group by c.id, c.member_no, c.full_name;

drop trigger if exists client_visit_locations_set_updated_at on public.client_visit_locations;
create trigger client_visit_locations_set_updated_at before update on public.client_visit_locations
for each row execute function public.set_updated_at();

drop trigger if exists client_live_locations_set_updated_at on public.client_live_locations;
create trigger client_live_locations_set_updated_at before update on public.client_live_locations
for each row execute function public.set_updated_at();

drop trigger if exists client_historical_allocations_set_updated_at on public.client_historical_allocations;
create trigger client_historical_allocations_set_updated_at before update on public.client_historical_allocations
for each row execute function public.set_updated_at();

drop trigger if exists client_historical_allocation_loans_set_updated_at on public.client_historical_allocation_loans;
create trigger client_historical_allocation_loans_set_updated_at before update on public.client_historical_allocation_loans
for each row execute function public.set_updated_at();

drop trigger if exists platform_fees_set_updated_at on public.platform_fees;
create trigger platform_fees_set_updated_at before update on public.platform_fees
for each row execute function public.set_updated_at();

drop trigger if exists mpesa_transactions_set_updated_at on public.mpesa_transactions;
create trigger mpesa_transactions_set_updated_at before update on public.mpesa_transactions
for each row execute function public.set_updated_at();
