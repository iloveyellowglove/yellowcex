'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { apiGet } from '../../lib/api';
import type { Balance } from '@/types/shared';

export function AccountOverview() {
  const { user } = useAuth();
  const [balances, setBalances] = useState<Balance[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = () => {
      apiGet<{ wallets: unknown[]; balances: Balance[] }>('/api/wallets').then((res) => {
        if (res.success && res.data) {
          setBalances(
            res.data.balances.filter((b) => parseFloat(b.available) > 0 || parseFloat(b.locked) > 0)
          );
        }
      });
    };
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user || balances.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center px-3 py-2 border-b border-[#2B3139] shrink-0">
          <span className="text-xs font-medium text-[#848E9C]">Balances</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-xs text-[#474D57]">
          No balances yet. Deposit funds to start trading.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center px-3 py-2 border-b border-[#2B3139] shrink-0">
        <span className="text-xs font-medium text-[#848E9C]">Balances</span>
      </div>
      <div className="grid grid-cols-3 px-3 py-1 text-[10px] text-[#474D57] uppercase tracking-wider shrink-0">
        <span>Asset</span>
        <span className="text-right">Available</span>
        <span className="text-right">Locked</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {balances.map((b) => (
          <div
            key={b.currency}
            className="grid grid-cols-3 px-3 py-1 text-xs hover:bg-[#1E2329] transition-colors"
          >
            <span className="font-mono font-medium text-white">{b.currency}</span>
            <span className="text-right font-mono text-[#EAECEF]">
              {parseFloat(b.available).toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </span>
            <span className="text-right font-mono text-[#848E9C]">
              {parseFloat(b.locked).toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
