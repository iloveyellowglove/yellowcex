'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '../../lib/api';
import { Header } from '../../components/layout/Header';

interface Plan {
  id: string;
  name: string;
  daily_return_percent: number;
  min_deposit_usdt: number;
  lock_days: number;
  is_active: boolean;
  created_at: string;
}

export default function InvestPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<Plan[]>('/api/investments/plans')
      .then((res) => {
        if (res.success && res.data) setPlans(res.data as Plan[]);
        else setError(res.error || 'Failed to load plans');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col">
      <Header />

      <div className="max-w-5xl mx-auto px-6 py-12 w-full">
        <h1 className="text-3xl font-bold text-white mb-2">Investment Plans</h1>
        <p className="text-[#848E9C] mb-10">
          Earn daily returns on your USDT deposits. Choose a plan below.
        </p>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-6 animate-pulse">
                <div className="h-5 w-24 bg-[#2B3139] rounded mb-3" />
                <div className="h-4 w-32 bg-[#2B3139] rounded mb-4" />
                <div className="h-4 w-20 bg-[#2B3139] rounded mb-3" />
                <div className="h-10 w-full bg-[#2B3139] rounded mt-4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-[#1E2329] border border-[#F6465D]/20 rounded-xl p-8 text-center">
            <p className="text-[#F6465D] mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-[#F0B90B] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-6 hover:border-[#F0B90B]/40 transition-all group"
              >
                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <div className="text-2xl font-bold text-[#F0B90B] mb-4">
                  {plan.daily_return_percent}% <span className="text-xs text-[#848E9C] font-normal">daily</span>
                </div>

                <div className="space-y-2 mb-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#848E9C]">Min Deposit</span>
                    <span className="text-white font-mono">
                      ${plan.min_deposit_usdt.toLocaleString()} USDT
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#848E9C]">Lock Period</span>
                    <span className="text-white">{plan.lock_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#848E9C]">Est. Monthly</span>
                    <span className="text-[#0ECB81] font-mono">
                      ~{(plan.daily_return_percent * 30).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <Link
                  href={`/invest/deposit?plan=${plan.id}`}
                  className="block w-full text-center py-2.5 bg-[#F0B90B] hover:bg-[#F8D33E] text-black font-semibold rounded-lg text-sm transition-colors"
                >
                  Invest Now
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
