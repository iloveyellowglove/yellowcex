-- Seed investment plans
-- Run this in Supabase SQL Editor to populate the plans table.

INSERT INTO public.investment_plans (name, daily_return_percent, min_deposit_usdt, lock_days)
VALUES
  ('V1 Starter',      1.3,  500,   30),
  ('V3 Accelerator',  2.0,  5000,  90),
  ('V5 Max',          2.6,  50000, 180)
ON CONFLICT DO NOTHING;
