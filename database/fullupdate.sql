-- ============================================================
-- SBC Modern Database: Full Schema + Functions + Views
-- Paste into Supabase SQL Editor for fresh setup
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- Auto-updated timestamp trigger
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ============================================================
-- Profiles (maps to Supabase auth.users)
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text unique,
  phone text,
  role text not null default 'loan_officer' check (role in ('admin', 'loan_officer', 'field_officer', 'savings_member')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  avatar_url text,
  bio text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ============================================================
-- Clients / Members
-- ============================================================

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  member_no text unique,
  first_name text not null,
  last_name text not null,
  full_name text not null default '',
  nickname text,
  marital_status text default 'Single' check (marital_status in ('Single', 'Married', 'Divorced', 'Widow', 'Widower')),
  id_number text,
  dob date,
  gender text default 'male' check (gender in ('male', 'female', 'other')),
  phone text not null,
  alt_phone text,
  email text,
  address text,
  city text,
  county text,
  sub_county text,
  ward text,
  town text,
  village text,
  business_name text,
  business_type text,
  business_location text,
  business_address text,
  location_next_to text,
  location_opposite text,
  location_between text,
  location_behind text,
  location_adjacent_to text,
  home_town_market text,
  home_village_estate text,
  home_ownership text default 'Rented' check (home_ownership in ('Rented', 'Owned')),
  home_plot_name text,
  home_house_number text,
  home_road text,
  home_location_description text,
  home_photos_attached boolean not null default false,
  loan_officer_id uuid references public.profiles (id) on delete set null,
  field_officer_id uuid references public.profiles (id) on delete set null,
  savings_only boolean not null default false,
  status text not null default 'active' check (status in ('active', 'review', 'inactive')),
  old_member_id text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Auto-generate member number if not provided
create or replace function public.generate_member_no()
returns trigger as $$
begin
  if new.member_no is null or new.member_no = '' then
    new.member_no := 'SBC-' || to_char(now(), 'YY') || lpad(nextval('member_no_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

-- Create sequence for auto member numbers
create sequence if not exists public.member_no_seq start 1 increment 1;

create or replace function public.set_full_name()
returns trigger
language plpgsql
as $$
begin
  new.full_name = COALESCE(TRIM(BOTH ' ' FROM CONCAT_WS(' ', new.first_name, new.last_name)), '');
  return new;
end;
$$;

drop trigger if exists clients_set_full_name on public.clients;
create trigger clients_set_full_name before insert or update on public.clients
for each row execute function public.set_full_name();

drop trigger if exists clients_set_member_no on public.clients;
create trigger clients_set_member_no before insert on public.clients
for each row execute function public.generate_member_no();

create index if not exists idx_clients_loan_officer on public.clients (loan_officer_id);
create index if not exists idx_clients_field_officer on public.clients (field_officer_id);
create index if not exists idx_clients_old_member_id on public.clients (old_member_id);
create index if not exists idx_clients_status on public.clients (status);
create index if not exists idx_clients_county on public.clients (county);
create index if not exists idx_clients_member_no on public.clients (member_no);

-- ============================================================
-- Member Portal Accounts (login credentials for members)
-- ============================================================

create table if not exists public.member_portal_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients (id) on delete cascade,
  login_phone text unique,
  membership_number text,
  password_hash text,
  last_login_at timestamptz,
  status text not null default 'active' check (status in ('active', 'inactive', 'locked')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ============================================================
-- Guarantors
-- ============================================================

create table if not exists public.guarantors (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  loan_id uuid references public.loans (id) on delete cascade,
  name text not null,
  relation text,
  phone text,
  id_number text,
  membership_number text,
  guaranteed_amount numeric(12, 2) not null default 0,
  signature_confirmed boolean not null default false,
  address text,
  status text not null default 'active' check (status in ('active', 'released', 'blacklisted')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_guarantors_client on public.guarantors (client_id);
create index if not exists idx_guarantors_loan on public.guarantors (loan_id);

-- ============================================================
-- Collateral
-- ============================================================

create table if not exists public.collateral (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  loan_id uuid references public.loans (id) on delete set null,
  collateral_type text not null,
  make_model text,
  serial_number text,
  description text,
  value_amount numeric(12, 2) not null default 0,
  location text,
  current_owner text,
  remarks text,
  joint_registration_fee_option text default 'Added to Loan' check (joint_registration_fee_option in ('Added to Loan', 'Deducted from Loan')),
  photos_attached boolean not null default false,
  document_path text,
  status text not null default 'active' check (status in ('active', 'released', 'forfeited')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_collateral_client on public.collateral (client_id);
create index if not exists idx_collateral_loan on public.collateral (loan_id);

-- ============================================================
-- Next of Kin
-- ============================================================

create table if not exists public.next_of_kin (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  relation text,
  phone text,
  address text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_nok_client on public.next_of_kin (client_id);

-- ============================================================
-- Application Contacts
-- ============================================================

create table if not exists public.application_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  full_name text not null,
  contact text,
  relationship text,
  location text,
  created_at timestamptz not null default timezone('utc', now())
);

-- ============================================================
-- Loans (core financial instrument)
-- ============================================================

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  loan_officer_id uuid references public.profiles (id) on delete set null,
  loan_cycle integer not null default 1,
  category text not null default 'other' check (category in ('business', 'agriculture', 'education', 'emergency', 'salary', 'other')),
  loan_purpose text,
  approval_date date,
  amount_requested numeric(12, 2) not null default 0,
  amount_approved numeric(12, 2),
  interest_rate numeric(5, 4) not null default 0,
  interest_amount numeric(12, 2) not null default 0,
  processing_fee numeric(12, 2) not null default 0,
  insurance_fee numeric(12, 2) not null default 0,
  collateral_joint_registration_fee numeric(12, 2) not null default 0,
  unpaid_shares numeric(12, 2) not null default 0,
  unpaid_savings numeric(12, 2) not null default 0,
  membership_card_status text not null default 'pending' check (membership_card_status in ('pending', 'issued', 'not_issued')),
  business_sticker_status text not null default 'pending' check (business_sticker_status in ('pending', 'issued', 'not_issued')),
  funds_transfer_fee numeric(12, 2) not null default 0,
  total_deductions numeric(12, 2) not null default 0,
  total_additions numeric(12, 2) not null default 0,
  total_to_repay numeric(12, 2) not null default 0,
  purpose text,
  term_weeks integer not null default 12,
  loan_period_days integer not null default 30,
  repayment_plan text not null default 'weekly' check (repayment_plan in ('daily', 'weekly', 'biweekly', 'monthly')),
  repayment_frequency text not null default 'weekly' check (repayment_frequency in ('daily', 'weekly', 'biweekly', 'monthly')),
  repayment_start_date date,
  repayment_end_date date,
  referred_by text,
  referrer_member_no text,
  daily_contribution numeric(12, 2) not null default 0,
  savings_amount numeric(12, 2) not null default 0,
  penalty_rate numeric(5, 4) not null default 0.02,
  default_interest_rate numeric(5, 4) not null default 0.05,
  skipped_penalty_waived boolean not null default false,
  overdue_penalty_waived boolean not null default false,
  total_repayment numeric(12, 2) not null default 0,
  net_disbursed numeric(12, 2) not null default 0,
  balance numeric(12, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'active', 'completed', 'defaulted', 'written_off')),
  workflow_status text not null default 'to_be_visited' check (workflow_status in ('to_be_visited', 'visited', 'credit_check', 'recommended_for_approval', 'rejected', 'approved', 'disbursed', 'closed')),
  disbursed_at timestamptz,
  disbursed_by uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz not null default timezone('utc', now()),
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  due_date date,
  old_loan_id text,
  notes text,
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_loans_client_id on public.loans (client_id);
create index if not exists idx_loans_status on public.loans (status);
create index if not exists idx_loans_workflow on public.loans (workflow_status);
create index if not exists idx_loans_old_loan_id on public.loans (old_loan_id);
create index if not exists idx_loans_officer on public.loans (loan_officer_id);
create index if not exists idx_loans_due_date on public.loans (due_date);
create index if not exists idx_loans_client_status on public.loans (client_id, status);

-- ============================================================
-- Loan Rejection Reasons
-- ============================================================

create table if not exists public.loan_rejection_reasons (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id) on delete cascade,
  rejected_by uuid references public.profiles (id) on delete set null,
  reason text not null,
  category text check (category in ('credit', 'collateral', 'business', 'behavioral', 'policy', 'other')),
  created_at timestamptz not null default timezone('utc', now())
);

-- ============================================================
-- Repayments
-- ============================================================

create table if not exists public.repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  payment_date date not null,
  amount numeric(12, 2) not null,
  principal_amount numeric(12, 2) not null default 0,
  interest_amount numeric(12, 2) not null default 0,
  penalty_amount numeric(12, 2) not null default 0,
  savings_amount numeric(12, 2) not null default 0,
  method text check (method in ('cash', 'mpesa', 'bank', 'cheque', 'deduction', 'wallet')),
  receipt_number text,
  notes text,
  synced_from_old_db boolean not null default false,
  old_receipt_number text,
  collected_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_repayments_loan on public.repayments (loan_id);
create index if not exists idx_repayments_client on public.repayments (client_id);
create index if not exists idx_repayments_date on public.repayments (payment_date);
create index if not exists idx_repayments_receipt on public.repayments (receipt_number);

-- ============================================================
-- Savings Contributions
-- ============================================================

create table if not exists public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  loan_id uuid references public.loans (id) on delete set null,
  amount numeric(12, 2) not null,
  contribution_date date not null,
  savings_bucket text not null check (savings_bucket in ('mandatory', 'mandatory_shares', 'multiplier', 'withdrawable', 'rounded_bucket')),
  notes text,
  collected_by uuid references public.profiles (id) on delete set null,
  receipt_number text,
  synced_from_old_db boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_savings_contributions_client on public.savings_contributions (client_id);
create index if not exists idx_savings_contributions_loan on public.savings_contributions (loan_id);

-- ============================================================
-- Savings Ledger (detailed bucket transactions)
-- ============================================================

create table if not exists public.savings_ledger (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  loan_id uuid references public.loans (id) on delete set null,
  savings_bucket text not null check (savings_bucket in ('mandatory', 'mandatory_shares', 'multiplier', 'withdrawable', 'rounded_bucket')),
  transaction_type text not null check (transaction_type in ('deposit', 'withdrawal', 'transfer', 'adjustment', 'redirect')),
  amount numeric(12, 2) not null,
  balance numeric(12, 2),
  receipt_number text,
  old_receipt_number text,
  transaction_date date not null,
  source_channel text not null default 'manual' check (source_channel in ('manual', 'legacy_sync', 'mpesa', 'cash', 'bank', 'multiplier_redirect')),
  description text,
  synced_from_old_db boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_savings_ledger_client on public.savings_ledger (client_id, savings_bucket);
create index if not exists idx_savings_ledger_receipt on public.savings_ledger (receipt_number);
create index if not exists idx_savings_ledger_date on public.savings_ledger (transaction_date);

-- ============================================================
-- Loan Payment Breakdowns (how each payment is split)
-- ============================================================

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
  interest_amount numeric(12, 2) not null default 0,
  penalty_amount numeric(12, 2) not null default 0,
  savings_amount numeric(12, 2) not null default 0,
  rounded_bucket_amount numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_breakdowns_loan on public.loan_payment_breakdowns (loan_id);
create index if not exists idx_breakdowns_client on public.loan_payment_breakdowns (client_id);
create index if not exists idx_breakdowns_receipt on public.loan_payment_breakdowns (receipt_number);
create index if not exists idx_breakdowns_date on public.loan_payment_breakdowns (payment_date);

-- ============================================================
-- Purpose Pool Allocations
-- ============================================================

create table if not exists public.purpose_pool_allocations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  loan_id uuid references public.loans (id) on delete set null,
  receipt_number text,
  transaction_date date not null,
  category_code text not null check (category_code in ('levies_permits', 'biashara_boost', 'welfare_fund', 'legal_fund', 'operation_admin', 'training', 'marketing', 'insurance', 'penalties', 'other')),
  category_label text not null,
  percentage numeric(5, 4) not null default 0,
  amount numeric(12, 2) not null default 0,
  source_channel text not null default 'multiplier_redirect' check (source_channel in ('manual', 'legacy_sync', 'mpesa', 'cash', 'bank', 'multiplier_redirect')),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_purpose_pool_client on public.purpose_pool_allocations (client_id);
create index if not exists idx_purpose_pool_loan on public.purpose_pool_allocations (loan_id);

-- ============================================================
-- Follow-ups & Field Visits
-- ============================================================

create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  officer_id uuid references public.profiles (id) on delete set null,
  visit_date date not null,
  location text,
  purpose text,
  notes text,
  outcome text check (outcome in ('positive', 'negative', 'neutral', 'needs_followup')),
  geo_lat numeric(10, 8),
  geo_lng numeric(11, 8),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
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

-- ============================================================
-- Member Balance Transfers
-- ============================================================

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

-- ============================================================
-- Historical Allocations & Loan Cycles
-- ============================================================

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

-- ============================================================
-- Platform Fees
-- ============================================================

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

-- ============================================================
-- Activity Logs / Audit Trail
-- ============================================================

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  details text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

-- ============================================================
-- Sync Runs
-- ============================================================

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  run_mode text not null default 'incremental' check (run_mode in ('full', 'incremental', 'callback')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  source_name text,
  records_seen integer not null default 0,
  records_written integer not null default 0,
  error_message text,
  details text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz
);

-- ============================================================
-- Legacy Transaction Sync
-- ============================================================

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

-- ============================================================
-- M-PESA Tables
-- ============================================================

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
  checkout_request_id text unique,
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

create index if not exists idx_mpesa_phone on public.mpesa_transactions (payer_phone);
create index if not exists idx_mpesa_status on public.mpesa_transactions (status);
create index if not exists idx_mpesa_matched_client on public.mpesa_transactions (matched_client_id);
create index if not exists idx_callbacks_processed on public.mpesa_callback_logs (processed);

-- ============================================================
-- Derived Views
-- ============================================================

-- Member savings portfolio balances
drop view if exists public.member_portfolio_balances;
create view public.member_portfolio_balances as
select
  c.id as client_id,
  c.member_no,
  c.full_name,
  c.phone,
  c.business_name,
  c.county,
  c.status,
  c.savings_only,
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
group by c.id, c.member_no, c.full_name, c.phone, c.business_name, c.county, c.status, c.savings_only;

-- Loan summary with balance computed from payments
drop view if exists public.loan_summaries;
create view public.loan_summaries as
select
  l.id,
  l.client_id,
  c.full_name as client_name,
  l.category,
  l.status,
  l.workflow_status,
  l.amount_requested,
  l.amount_approved,
  l.interest_rate,
  l.repayment_frequency,
  l.repayment_plan,
  l.term_weeks,
  l.loan_period_days,
  l.due_date,
  l.principal,
  l.net_disbursed,
  l.total_repayment,
  l.balance as stated_balance,
  coalesce(sum(bp.loan_amount), 0) as total_paid,
  greatest(l.amount_approved - coalesce(sum(bp.loan_amount), 0), 0) as computed_balance
from public.loans l
left join public.clients c on c.id = l.client_id
left join public.loan_payment_breakdowns bp on bp.loan_id = l.id
group by l.id, c.full_name;

-- Daily collections summary
drop view if exists public.daily_collections;
create view public.daily_collections as
select
  payment_date,
  count(*) as transaction_count,
  sum(loan_amount) as total_principal_collected,
  sum(interest_amount) as total_interest_collected,
  sum(penalty_amount) as total_penalty_collected,
  sum(savings_amount) as total_savings_collected,
  sum(total_amount) as total_collected
from public.loan_payment_breakdowns
group by payment_date
order by payment_date desc;

-- Overdue loans view
drop view if exists public.overdue_loans;
create view public.overdue_loans as
select
  l.id,
  l.client_id,
  c.full_name as client_name,
  c.phone,
  l.balance as outstanding,
  l.due_date,
  current_date - l.due_date as days_overdue,
  l.penalty_rate,
  l.status
from public.loans l
join public.clients c on c.id = l.client_id
where l.status in ('active', 'approved')
  and l.due_date < current_date
  and l.balance > 0
order by days_overdue desc;

-- ============================================================
-- Triggers
-- ============================================================

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists portal_accounts_updated on public.member_portal_accounts;
create trigger portal_accounts_updated before update on public.member_portal_accounts
for each row execute function public.set_updated_at();

drop trigger if exists loans_set_updated_at on public.loans;
create trigger loans_set_updated_at before update on public.loans
for each row execute function public.set_updated_at();

drop trigger if exists client_visit_locations_updated on public.client_visit_locations;
create trigger client_visit_locations_updated before update on public.client_visit_locations
for each row execute function public.set_updated_at();

drop trigger if exists client_live_locations_updated on public.client_live_locations;
create trigger client_live_locations_updated before update on public.client_live_locations
for each row execute function public.set_updated_at();

drop trigger if exists historical_allocations_updated on public.client_historical_allocations;
create trigger historical_allocations_updated before update on public.client_historical_allocations
for each row execute function public.set_updated_at();

drop trigger if exists historical_allocation_loans_updated on public.client_historical_allocation_loans;
create trigger historical_allocation_loans_updated before update on public.client_historical_allocation_loans
for each row execute function public.set_updated_at();

drop trigger if exists platform_fees_updated on public.platform_fees;
create trigger platform_fees_updated before update on public.platform_fees
for each row execute function public.set_updated_at();

drop trigger if exists mpesa_transactions_updated on public.mpesa_transactions;
create trigger mpesa_transactions_updated before update on public.mpesa_transactions
for each row execute function public.set_updated_at();

-- ============================================================
-- RLS Policies (enable after initial setup)
-- ============================================================
-- Enable RLS on key tables and create policies in a separate migration
-- to keep initial schema clean.

-- ============================================================
-- Default Data: Fee Schedule
-- ============================================================
-- These can be configured by admin; defaults for reference:

insert into public.platform_fees (fee_name, amount, effective_date, scope_mode, is_active, notes) values
  ('Loan Processing Fee', 1000.00, '2026-01-01', 'current_members_only', true, 'Standard processing fee per loan application'),
  ('Insurance Premium', 500.00, '2026-01-01', 'current_members_only', true, 'Mandatory loan insurance'),
  ('Membership Registration', 500.00, '2026-01-01', 'all_members', true, 'One-time registration fee for new members'),
  ('Business Sticker', 200.00, '2026-01-01', 'current_members_only', true, 'Annual business identification sticker'),
  ('Funds Transfer Fee', 50.00, '2026-01-01', 'current_members_only', true, 'M-PESA transfer fee per transaction');