'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { apiPost } from '../../../lib/api';
import { Header } from '../../../components/layout/Header';
import { SUPPORTED_CURRENCIES } from '@/types/shared';

export default function WithdrawPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [currency, setCurrency] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
  }, [user, loading, router]);

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!address.trim()) {
      setError('Enter a destination address');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await apiPost<{ withdrawalId: string; status: string }>('/api/payments/withdraw', {
        amount: amt,
        currency,
        address: address.trim(),
      });
      if (res.success && res.data) {
        setSuccess(`Withdrawal submitted. ID: ${res.data.withdrawalId}. Status: ${res.data.status}`);
        setAmount('');
        setAddress('');
      } else {
        setError(res.message || 'Withdrawal failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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

        <h1 className="text-2xl font-bold text-white mb-8">Withdraw</h1>

        <div className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-6">
          <label className="block text-sm text-[#848E9C] mb-2">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F0B90B] transition-colors mb-4"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="block text-sm text-[#848E9C] mb-2">
            Amount <span className="text-[#F6465D]">*</span>
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-[#F0B90B] transition-colors mb-4"
            min={0}
            step="any"
          />

          <label className="block text-sm text-[#848E9C] mb-2">
            Destination Address <span className="text-[#F6465D]">*</span>
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-[#F0B90B] transition-colors mb-6"
          />

          {error && (
            <p className="text-sm text-[#F6465D] mb-4 bg-[#F6465D]/5 rounded-lg px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="text-sm text-[#0ECB81] mb-4 bg-[#0ECB81]/5 rounded-lg px-3 py-2">{success}</p>
          )}

          <button
            onClick={handleWithdraw}
            disabled={submitting || !amount || !address}
            className="w-full py-3 bg-[#F0B90B] hover:bg-[#F8D33E] disabled:opacity-50 text-black font-semibold rounded-lg text-sm transition-colors"
          >
            {submitting ? 'Processing...' : 'Withdraw'}
          </button>

          <p className="text-[10px] text-[#848E9C] mt-3 text-center">
            Withdrawals are processed by Plisio and may take a few minutes
          </p>
        </div>
      </div>
    </div>
  );
}
