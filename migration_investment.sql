-- Investment Plans
CREATE TABLE IF NOT EXISTS public.investment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  daily_return_percent DECIMAL(5,2) NOT NULL,
  min_deposit_usdt DECIMAL(12,2) NOT NULL,
  lock_days INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Investments
CREATE TABLE IF NOT EXISTS public.user_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  plan_id UUID REFERENCES investment_plans(id) NOT NULL,
  amount_usdt DECIMAL(12,2) NOT NULL,
  start_date TIMESTAMPTZ DEFAULT now(),
  total_earned DECIMAL(12,2) DEFAULT 0,
  last_credit_date TIMESTAMPTZ,
  is_withdrawn BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investments_user ON public.user_investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_plan ON public.user_investments(plan_id);

-- RLS
ALTER TABLE public.investment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read active plans" ON public.investment_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Users read own investments" ON public.user_investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own investments" ON public.user_investments FOR INSERT WITH CHECK (auth.uid() = user_id);
