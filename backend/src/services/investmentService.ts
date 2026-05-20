import { config } from '../config';

const supabaseHeaders = {
  apikey: config.supabase.serviceRoleKey,
  Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
  'Content-Type': 'application/json',
};

export async function getActivePlans() {
  return supabaseGet<Array<Record<string, unknown>>>('investment_plans?select=*&is_active=eq.true&order=min_deposit_usdt.asc');
}

async function supabaseGet<T>(path: string): Promise<T> {
  const res = await fetch(`${config.supabase.url}/rest/v1/${path}`, { headers: supabaseHeaders });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `Supabase GET ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function supabasePost<T>(table: string, body: unknown): Promise<T> {
  const res = await fetch(`${config.supabase.url}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `Supabase POST ${table} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function supabasePatch(table: string, body: unknown, eqCol: string, eqVal: string): Promise<void> {
  const res = await fetch(
    `${config.supabase.url}/rest/v1/${table}?${eqCol}=eq.${encodeURIComponent(eqVal)}`,
    {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `Supabase PATCH ${table} failed: ${res.status}`);
  }
}

export async function createInvestment(userId: string, planId: string, amount: number) {
  const allPlans = await supabaseGet<Array<{ id: string; name: string; daily_return_percent: number; min_deposit_usdt: number; lock_days: number; is_active: boolean }>>('investment_plans?select=*&is_active=eq.true');

  const plan = (allPlans || []).find((p) => p.id === planId);
  if (!plan) throw new Error('Investment plan not found or inactive');

  if (amount < plan.min_deposit_usdt) {
    throw new Error(`Minimum deposit for ${plan.name} is ${plan.min_deposit_usdt} USDT`);
  }

  const [investment] = await supabasePost<Array<Record<string, unknown>>>('user_investments', {
    user_id: userId,
    plan_id: planId,
    amount_usdt: amount,
    start_date: new Date().toISOString(),
  });

  // Referral commissions — walk up to 5 levels of referrers
  try {
    const commissionRates = [0, 0.10, 0.05, 0.03, 0.02, 0.01];
    let currentUserId: string | null = userId;

    for (let level = 1; level <= 5; level++) {
      const userResult = await supabaseGet<Array<{ referred_by: string | null }>>(`users?select=referred_by&id=eq.${encodeURIComponent(currentUserId!)}`);
      const currentUser = userResult?.[0];
      if (!currentUser?.referred_by) break;

      const referrerId: string = currentUser.referred_by;
      const commission = amount * commissionRates[level];

      const [referrer] = await supabaseGet<Array<{ referral_earnings: number | null }>>(`users?select=referral_earnings&id=eq.${encodeURIComponent(referrerId)}`);
      if (!referrer) break;

      const newEarnings = (referrer.referral_earnings || 0) + commission;
      await supabasePatch('users', { referral_earnings: newEarnings }, 'id', referrerId);

      console.log(`Referral commission: level ${level} user ${referrerId} +${commission} USDT (${commissionRates[level] * 100}% of ${amount})`);
      currentUserId = referrerId;
    }
  } catch (err) {
    console.error('Referral chain processing failed:', err instanceof Error ? err.message : err);
  }

  return investment;
}

export async function getUserInvestments(userId: string) {
  const data = await supabaseGet<Array<Record<string, unknown>>>(
    `user_investments?select=*,investment_plans(name,daily_return_percent,lock_days)&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`
  );
  return data;
}

export async function distributeDailyReturns() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const investments = await supabaseGet<Array<Record<string, unknown>>>(
    `user_investments?select=*,investment_plans!inner(daily_return_percent)&is_withdrawn=eq.false&or=(last_credit_date.is.null,last_credit_date.lte.${encodeURIComponent(twentyFourHoursAgo)})`
  );

  let updated = 0;

  for (const inv of (investments || [])) {
    const plan = Array.isArray(inv.investment_plans)
      ? inv.investment_plans[0]
      : inv.investment_plans;

    if (!plan) continue;

    const dailyReturn = (inv.amount_usdt as number) * ((plan.daily_return_percent as number) / 100);
    const newTotal = (inv.total_earned as number) + dailyReturn;

    try {
      await supabasePatch('user_investments', {
        total_earned: newTotal,
        last_credit_date: new Date().toISOString(),
      }, 'id', inv.id as string);
      updated++;
    } catch (err) {
      console.error(`Failed to credit investment ${inv.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`distributeDailyReturns: credited ${updated} investments`);
  return { updated };
}
