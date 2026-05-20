-- YellowCEX Database Schema
-- Run this in Supabase SQL Editor

-- Users table (extends Supabase auth.users)
-- In production, this should reference auth.users(id) to make RLS policies work:
--   id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
-- For development, gen_random_uuid() is used since the backend uses service_role (bypasses RLS).
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  kyc_status TEXT DEFAULT 'none' CHECK (kyc_status IN ('none', 'pending', 'approved', 'rejected')),
  google_id TEXT UNIQUE,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- KYC documents
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('passport', 'drivers_license', 'national_id')),
  image_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Wallets (HD derived addresses)
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('BTC','ETH','USDT','USDC','SOL','BNB','XRP','ADA','DOGE','MATIC')),
  address TEXT NOT NULL,
  balance TEXT DEFAULT '0',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, currency)
);

-- Balances (available + locked)
CREATE TABLE IF NOT EXISTS public.balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('BTC','ETH','USDT','USDC','SOL','BNB','XRP','ADA','DOGE','MATIC')),
  available TEXT DEFAULT '0',
  locked TEXT DEFAULT '0',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, currency)
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  type TEXT NOT NULL CHECK (type IN ('limit', 'market')),
  price TEXT NOT NULL,
  amount TEXT NOT NULL,
  filled TEXT DEFAULT '0',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'partial', 'filled', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trades
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair TEXT NOT NULL,
  price TEXT NOT NULL,
  amount TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  buy_order_id UUID REFERENCES public.orders(id),
  sell_order_id UUID REFERENCES public.orders(id),
  buyer_id UUID REFERENCES public.users(id),
  seller_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions (deposits, withdrawals, trade settlements)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'trade_buy', 'trade_sell')),
  currency TEXT NOT NULL,
  amount TEXT NOT NULL,
  tx_hash TEXT,
  withdrawal_address TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auth tokens (for JWT refresh)
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_balances_user ON public.balances(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_pair_status ON public.orders(pair, status);
CREATE INDEX IF NOT EXISTS idx_trades_pair ON public.trades(pair);
CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades(buyer_id, seller_id);
CREATE INDEX IF NOT EXISTS idx_trades_created ON public.trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_user ON public.kyc_documents(user_id);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role bypasses RLS, these are for anon/authenticated)
CREATE POLICY "Users read own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users read own wallets" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own balances" ON public.balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own trades" ON public.trades FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Users read own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own kyc" ON public.kyc_documents FOR SELECT USING (auth.uid() = user_id);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER balances_updated_at BEFORE UPDATE ON public.balances FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
