'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { apiGet } from '../../lib/api';
import { Header } from '../../components/layout/Header';
import { Copy, Check } from 'lucide-react';

interface ReferralStats {
  referral_code: string;
  referral_link: string;
  downline_count: number;
  total_earned: number;
}

export default function ReferralPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      apiGet<ReferralStats>('/api/investments/referral-stats')
        .then((res) => {
          if (res.success && res.data) setStats(res.data as ReferralStats);
          else setError(res.error || 'Failed to load referral stats');
        })
        .catch(() => setError('Network error'))
        .finally(() => setFetching(false));
    }
  }, [user, loading, router]);

  const handleCopy = async () => {
    if (!stats) return;
    try {
      await navigator.clipboard.writeText(stats.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = stats.referral_link;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col">
      <Header />

      <div className="max-w-4xl mx-auto px-6 py-12 w-full">
        <h1 className="text-2xl font-bold text-white mb-2">Referral Program</h1>
        <p className="text-sm text-[#848E9C] mb-10">
          Share your referral link and earn rewards when friends sign up and invest.
        </p>

        {error && (
          <div className="bg-[#F6465D]/5 border border-[#F6465D]/20 rounded-lg px-4 py-3 text-sm text-[#F6465D] mb-6">
            {error}
          </div>
        )}

        {stats && (
          <>
            {/* Referral link card */}
            <div className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-6 mb-8">
              <h2 className="text-sm font-semibold text-white mb-4">Your Referral Link</h2>
              <div className="flex items-center gap-3">
                <code className="flex-1 bg-[#0B0E11] border border-[#2B3139] rounded-lg px-4 py-3 text-sm text-[#EAECEF] font-mono break-all select-all">
                  {stats.referral_link}
                </code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 px-4 py-3 bg-[#F0B90B] hover:bg-[#F8D33E] text-black font-semibold rounded-lg text-sm transition-colors inline-flex items-center gap-2"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] text-[#848E9C] uppercase tracking-wider">Your Code:</span>
                <code className="text-sm text-[#F0B90B] font-mono font-bold">{stats.referral_code}</code>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-5">
                <p className="text-2xl font-bold text-white mb-1">{stats.downline_count}</p>
                <p className="text-xs text-[#848E9C] uppercase tracking-wider">Downline Users</p>
              </div>
              <div className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-5">
                <p className="text-2xl font-bold text-[#0ECB81] font-mono mb-1">
                  ${stats.total_earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-[#848E9C] uppercase tracking-wider">Total Referral Earnings</p>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">How It Works</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#F0B90B]/10 flex items-center justify-center shrink-0">
                    <span className="text-xs text-[#F0B90B] font-bold">1</span>
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium mb-1">Share</p>
                    <p className="text-xs text-[#848E9C]">Share your referral link with friends and community.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#F0B90B]/10 flex items-center justify-center shrink-0">
                    <span className="text-xs text-[#F0B90B] font-bold">2</span>
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium mb-1">Sign Up</p>
                    <p className="text-xs text-[#848E9C]">Friends sign up and create their YellowCEX account.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#F0B90B]/10 flex items-center justify-center shrink-0">
                    <span className="text-xs text-[#F0B90B] font-bold">3</span>
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium mb-1">Earn</p>
                    <p className="text-xs text-[#848E9C]">Earn rewards from their trading and investment activity.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
