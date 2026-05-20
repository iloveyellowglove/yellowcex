'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { apiGet } from '../../../lib/api';
import { Header } from '../../../components/layout/Header';

interface Investment {
  id: string;
  user_id: string;
  plan_id: string;
  amount_usdt: number;
  start_date: string;
  total_earned: number;
  last_credit_date: string | null;
  is_withdrawn: boolean;
  created_at: string;
  investment_plans?: {
    name: string;
    daily_return_percent: number;
    lock_days: number;
  } | { name: string; daily_return_percent: number; lock_days: number }[];
}

export default function EarningsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const fetchInvestments = () => {
    apiGet<Investment[]>('/api/investments/earnings')
      .then((res) => {
        if (res.success && res.data) setInvestments(res.data as Investment[]);
        else setError(res.error || 'Failed to load earnings');
      })
      .catch(() => setError('Network error'))
      .finally(() => setFetching(false));
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user) fetchInvestments();
  }, [user, loading, router]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    const id = setInterval(fetchInvestments, 60000);
    return () => clearInterval(id);
  }, [user]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const getPlanName = (inv: Investment): string => {
    const plans = inv.investment_plans;
    if (!plans) return '—';
    if (Array.isArray(plans)) return plans[0]?.name || '—';
    return plans.name || '—';
  };

  const totalEarned = investments.reduce(
    (sum, inv) => sum + (inv.total_earned || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col">
      <Header />

      <div className="max-w-4xl mx-auto px-6 py-12 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">My Earnings</h1>
            <p className="text-sm text-[#848E9C]">
              Track your active investments and daily returns.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#848E9C] uppercase tracking-wider mb-1">Total Earned</p>
            <p className="text-2xl font-bold text-[#0ECB81] font-mono">
              ${totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-[#F6465D]/5 border border-[#F6465D]/20 rounded-lg px-4 py-3 text-sm text-[#F6465D] mb-6">
            {error}
          </div>
        )}

        {investments.length === 0 ? (
          <div className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-10 text-center">
            <p className="text-[#848E9C] mb-4">No active investments yet.</p>
            <button
              onClick={() => router.push('/invest')}
              className="px-6 py-2.5 bg-[#F0B90B] text-black font-semibold rounded-lg text-sm hover:bg-[#F8D33E] transition-colors"
            >
              View Plans
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {investments.map((inv) => (
              <div
                key={inv.id}
                className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{getPlanName(inv)}</h3>
                    <p className="text-xs text-[#848E9C] mt-0.5">
                      Started {new Date(inv.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${inv.is_withdrawn ? 'bg-[#F6465D]/10 text-[#F6465D]' : 'bg-[#0ECB81]/10 text-[#0ECB81]'}`}>
                    {inv.is_withdrawn ? 'Withdrawn' : 'Active'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-[10px] text-[#474D57] uppercase tracking-wider">Invested</span>
                    <p className="text-white font-mono mt-0.5">
                      ${inv.amount_usdt.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#474D57] uppercase tracking-wider">Earned</span>
                    <p className="text-[#0ECB81] font-mono mt-0.5">
                      ${inv.total_earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#474D57] uppercase tracking-wider">Last Credit</span>
                    <p className="text-[#848E9C] font-mono mt-0.5 text-xs">
                      {inv.last_credit_date
                        ? new Date(inv.last_credit_date).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
