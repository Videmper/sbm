-- Delta migration: Fix generated column issue and add missing features
-- Date: 2026-05-12
-- Context: Supabase PostgreSQL rejects concat_ws/trim as non-immutable
--          in GENERATED ALWAYS AS. Fix: regular column + trigger approach.

-- 1) Drop the broken GENERATED column if it exists (no-op if already fixed)
ALTER TABLE public.clients DROP COLUMN IF EXISTS full_name CASCADE;

-- 2) Add full_name as a regular text column
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS full_name text NOT NULL DEFAULT '';

-- 3) Replace the function with an immutable-safe version
CREATE OR REPLACE FUNCTION public.set_full_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.full_name = COALESCE(TRIM(BOTH ' ' FROM CONCAT_WS(' ', NEW.first_name, NEW.last_name)), '');
  RETURN NEW;
END;
$$;

-- 4) Recreate the trigger
DROP TRIGGER IF EXISTS clients_set_full_name ON public.clients;
CREATE TRIGGER clients_set_full_name
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_full_name();

-- 5) Backfill existing rows
UPDATE public.clients
SET full_name = COALESCE(TRIM(BOTH ' ' FROM CONCAT_WS(' ', first_name, last_name)), '')
WHERE full_name = '' OR full_name IS NULL;

-- 6) Add comment documenting the approach
COMMENT ON COLUMN public.clients.full_name IS
  'Computed via trigger (not GENERATED) because Supabase uses Citus where concat_ws/trim are STABLE, not IMMUTABLE.';

-- 7) Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_loans_client_status ON public.loans (client_id, status);
CREATE INDEX IF NOT EXISTS idx_escrow_payment_breakdowns ON public.loan_payment_breakdowns (loan_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_mpesa_txn_receipt ON public.mpesa_transactions (mpesa_receipt_number);
