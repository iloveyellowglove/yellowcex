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
      apiGet<{ wallets: any[]; balances: Balance[] }>('/api/wallets').then((res) => {
        if (res.success && res.data) setBalances(res.data.balances.filter((b) => parseFloat(b.available) > 0 || parseFloat(b.locked) > 0));
      });
    };
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user || balances.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center px-3 py-2 border-b border-[hsl(220,13%,15%)]">
          <span className="text-xs font-medium text-[hsl(220,10%,60%)]">Balances</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-xs text-[hsl(220,10%,50%)]">
          No balances yet. Deposit funds to start trading.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center px-3 py-2 border-b border-[hsl(220,13%,15%)]">
        <span className="text-xs font-medium text-[hsl(220,10%,60%)]">Balances</span>
      </div>
      <div className="grid grid-cols-3 px-3 py-1 text-[10px] text-[hsl(220,10%,40%)] uppercase tracking-wider">
        <span>Asset</span>
        <span className="text-right">Available</span>
        <span className="text-right">Locked</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {balances.map((b) => (
          <div key={b.currency} className="grid grid-cols-3 px-3 py-1 text-xs">
            <span className="font-mono font-medium">{b.currency}</span>
            <span className="text-right font-mono text-[hsl(220,10%,80%)]">
              {parseFloat(b.available).toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </span>
            <span className="text-right font-mono text-[hsl(220,10%,50%)]">
              {parseFloat(b.locked).toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
