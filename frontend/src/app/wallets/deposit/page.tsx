'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { apiGet, apiPost } from '../../../lib/api';
import { Header } from '../../../components/layout/Header';
import { SUPPORTED_CURRENCIES, type Balance } from '@/types/shared';

export default function DepositPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [currency, setCurrency] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [balances, setBalances] = useState<Balance[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    apiGet<Balance[]>('/api/payments/deposits')
      .then(() => {}) // warm up
      .catch(() => {});
  }, [user]);

  const handleDeposit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await apiPost<{ invoiceUrl: string; invoiceId: string; amount: string }>('/api/payments/deposit', {
        amount: amt,
        currency,
      });
      if (res.success && res.data) {
        setInvoiceUrl(res.data.invoiceUrl);
      } else {
        setError(res.message || 'Deposit failed');
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

  if (invoiceUrl) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex flex-col">
        <Header />
        <div className="max-w-lg mx-auto px-6 py-12 w-full text-center">
          <div className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-8">
            <div className="w-12 h-12 bg-[#0ECB81]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#0ECB81]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Invoice Created</h2>
            <p className="text-sm text-[#848E9C] mb-6">
              Pay {amount} {currency} via Plisio
            </p>
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full py-3 bg-[#F0B90B] hover:bg-[#F8D33E] text-black font-semibold rounded-lg text-sm transition-colors mb-3"
            >
              Open Payment Page
            </a>
            <button
              onClick={() => {
                setInvoiceUrl('');
                setAmount('');
              }}
              className="text-sm text-[#848E9C] hover:text-white transition-colors"
            >
              Create another deposit
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-[#F0B90B] transition-colors mb-2"
            min={0}
            step="any"
          />

          {error && (
            <p className="text-sm text-[#F6465D] mb-4 bg-[#F6465D]/5 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleDeposit}
            disabled={submitting || !amount}
            className="w-full py-3 bg-[#F0B90B] hover:bg-[#F8D33E] disabled:opacity-50 text-black font-semibold rounded-lg text-sm transition-colors"
          >
            {submitting ? 'Creating invoice...' : 'Continue to Payment'}
          </button>

          <p className="text-[10px] text-[#848E9C] mt-3 text-center">
            You will be redirected to Plisio to complete your payment
          </p>
        </div>
      </div>
    </div>
  );
}
