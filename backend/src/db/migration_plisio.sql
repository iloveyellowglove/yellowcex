-- Plisio Payment Integration
-- Run this in Supabase SQL Editor

-- Plisio deposit invoices
CREATE TABLE IF NOT EXISTS public.plisio_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invoice_id TEXT NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
  source_currency TEXT,
  source_amount TEXT,
  txn_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_plisio_deposits_invoice ON public.plisio_deposits(invoice_id);
CREATE INDEX IF NOT EXISTS idx_plisio_deposits_user ON public.plisio_deposits(user_id);

-- Plisio withdrawals
CREATE TABLE IF NOT EXISTS public.plisio_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  withdrawal_id TEXT NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  address TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  txn_id TEXT,
  fee TEXT DEFAULT '0',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_plisio_withdrawals_id ON public.plisio_withdrawals(withdrawal_id);
CREATE INDEX IF NOT EXISTS idx_plisio_withdrawals_user ON public.plisio_withdrawals(user_id);

-- RLS
ALTER TABLE public.plisio_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plisio_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own deposits" ON public.plisio_deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own withdrawals" ON public.plisio_withdrawals FOR SELECT USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER plisio_deposits_updated_at BEFORE UPDATE ON public.plisio_deposits FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER plisio_withdrawals_updated_at BEFORE UPDATE ON public.plisio_withdrawals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
