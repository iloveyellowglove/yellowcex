'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { apiGet, apiPost } from '../../../lib/api';
import { Header } from '../../../components/layout/Header';

interface Plan {
  id: string;
  name: string;
  daily_return_percent: number;
  min_deposit_usdt: number;
  lock_days: number;
}

export default function DepositPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan') || '';

  const [plan, setPlan] = useState<Plan | null>(null);
  const [amount, setAmount] = useState('');
  const [planLoading, setPlanLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!planId) {
      setError('No plan specified');
      setPlanLoading(false);
      return;
    }

    apiGet<Plan[]>('/api/investments/plans')
      .then((res) => {
        if (res.success && res.data) {
          const found = (res.data as Plan[]).find((p) => p.id === planId);
          if (found) setPlan(found);
          else setError('Plan not found');
        } else {
          setError('Failed to load plan');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setPlanLoading(false));
  }, [planId]);

  const handleDeposit = async () => {
    if (!plan) return;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (amt < plan.min_deposit_usdt) {
      setError(`Minimum deposit is ${plan.min_deposit_usdt} USDT for ${plan.name}`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await apiPost<unknown>('/api/investments/deposit', {
        plan_id: plan.id,
        amount: amt,
      });
      if (res.success) {
        router.push('/invest/earnings');
      } else {
        setError(res.error || 'Deposit failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || planLoading) {
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

  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col">
      <Header />

      <div className="max-w-lg mx-auto px-6 py-12 w-full">
        <button
          onClick={() => router.back()}
          className="text-sm text-[#848E9C] hover:text-white mb-6 inline-flex items-center gap-1 transition-colors"
        >
          &larr; Back
        </button>

        <h1 className="text-2xl font-bold text-white mb-8">Deposit</h1>

        {error && !plan ? (
          <div className="bg-[#1E2329] border border-[#F6465D]/20 rounded-xl p-8 text-center">
            <p className="text-[#F6465D]">{error}</p>
          </div>
        ) : plan ? (
          <div className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-6">
            <div className="mb-6 pb-6 border-b border-[#2B3139]">
              <h2 className="text-lg font-bold text-white mb-2">{plan.name}</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[#848E9C]">Daily Return</span>
                  <p className="text-[#F0B90B] font-bold">{plan.daily_return_percent}%</p>
                </div>
                <div>
                  <span className="text-[#848E9C]">Lock Period</span>
                  <p className="text-white">{plan.lock_days} days</p>
                </div>
                <div>
                  <span className="text-[#848E9C]">Min Deposit</span>
                  <p className="text-white">${plan.min_deposit_usdt.toLocaleString()} USDT</p>
                </div>
              </div>
            </div>

            <label className="block text-sm text-[#848E9C] mb-2">
              Amount (USDT) <span className="text-[#F6465D]">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min ${plan.min_deposit_usdt} USDT`}
              className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-[#F0B90B] transition-colors mb-2"
              min={plan.min_deposit_usdt}
              step="any"
            />
            <p className="text-[10px] text-[#848E9C] mb-6">
              Minimum: {plan.min_deposit_usdt.toLocaleString()} USDT
            </p>

            {error && (
              <p className="text-sm text-[#F6465D] mb-4 bg-[#F6465D]/5 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleDeposit}
              disabled={submitting}
              className="w-full py-3 bg-[#F0B90B] hover:bg-[#F8D33E] disabled:opacity-50 text-black font-semibold rounded-lg text-sm transition-colors"
            >
              {submitting ? 'Processing...' : 'Deposit'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
