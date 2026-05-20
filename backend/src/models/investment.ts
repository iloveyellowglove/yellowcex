export interface InvestmentPlan {
  id: string;
  name: string;
  daily_return_percent: number;
  min_deposit_usdt: number;
  lock_days: number;
  is_active: boolean;
  created_at: string;
}

export interface UserInvestment {
  id: string;
  user_id: string;
  plan_id: string;
  amount_usdt: number;
  start_date: string;
  total_earned: number;
  last_credit_date: string | null;
  is_withdrawn: boolean;
  created_at: string;
}
