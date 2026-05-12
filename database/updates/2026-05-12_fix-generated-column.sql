-- ============================================================
-- SBC Modern Database Migration: 2026-05-12
-- Fix generated column issue + add missing features
-- Apply this AFTER fullupdate.sql
-- ============================================================

-- 1) Drop the broken GENERATED column if it exists
ALTER TABLE public.clients DROP COLUMN IF EXISTS full_name CASCADE;

-- 2) Add full_name as a regular text column (trigger handles population)
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
CREATE INDEX IF NOT EXISTS idx_guarantors_loan ON public.guarantors (loan_id);
CREATE INDEX IF NOT EXISTS idx_collateral_loan_collect ON public.collateral (loan_id);

-- 8) Add new columns for loan rejection tracking
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS notes text;

-- 9) Enable Row Level Security on key tables (uncomment when ready)
-- ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.savings_ledger ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- 10) Create RLS policies (uncomment and customize when ready)
-- CREATE POLICY "Admins have full access" ON public.clients
--   FOR ALL USING (true) WITH CHECK (true);
--
-- CREATE POLICY "Loan officers can view clients" ON public.clients
--   FOR SELECT USING (
--     EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'loan_officer'))
--   );
--
-- CREATE POLICY "Members can view own data" ON public.clients
--   FOR SELECT USING (auth.uid() = id);

-- 11) Create function to compute loan balance from payment breakdowns
CREATE OR REPLACE FUNCTION public.compute_loan_balance(p_loan_id uuid)
RETURNS numeric AS $$
DECLARE
  v_principal numeric;
  v_total_paid numeric;
BEGIN
  SELECT COALESCE(amount_approved, amount_requested, 0) INTO v_principal
  FROM public.loans WHERE id = p_loan_id;

  SELECT COALESCE(SUM(loan_amount), 0) INTO v_total_paid
  FROM public.loan_payment_breakdowns WHERE loan_id = p_loan_id;

  RETURN GREATEST(v_principal - v_total_paid, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- 12) Create function to get member total savings
CREATE OR REPLACE FUNCTION public.get_member_total_savings(p_client_id uuid)
RETURNS numeric AS $$
DECLARE
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM public.savings_ledger
  WHERE client_id = p_client_id
    AND transaction_type IN ('deposit', 'adjustment');
  RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;

-- 13) Add audit logging function
CREATE OR REPLACE FUNCTION public.log_activity(p_actor_id uuid, p_action text, p_details text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.activity_logs (actor_id, action, details, metadata)
  VALUES (p_actor_id, p_action, p_details, p_metadata)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14) Grant execute permissions
GRANT EXECUTE ON FUNCTION public.compute_loan_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_total_savings TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_activity TO authenticated;