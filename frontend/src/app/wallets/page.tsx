'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Header } from '../../components/layout/Header';
import { apiGet } from '../../lib/api';
import type { Wallet, Balance } from '@yellowcex/shared';

export default function WalletsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) {
      apiGet<{ wallets: Wallet[]; balances: Balance[] }>('/api/wallets')
        .then((res) => {
          if (res.success && res.data) {
            setWallets(res.data.wallets);
            setBalances(res.data.balances);
          }
        })
        .finally(() => setFetching(false));
    }
  }, [user, loading, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[hsl(220,13%,7%)] flex flex-col">
      <Header />
      <div className="max-w-4xl mx-auto w-full px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Wallets</h1>

        {fetching ? (
          <div className="text-center py-12 text-[hsl(220,10%,50%)]">Loading wallets...</div>
        ) : (
          <div className="grid gap-3">
            {balances.map((balance) => {
              const wallet = wallets.find((w) => w.currency === balance.currency);
              return (
                <div
                  key={balance.currency}
                  className="bg-[hsl(220,15%,11%)] border border-[hsl(220,13%,18%)] rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-semibold text-lg">{balance.currency}</span>
                    <span className="text-lg font-mono">
                      {parseFloat(balance.available).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[hsl(220,10%,60%)]">
                    <span>Locked: {parseFloat(balance.locked).toLocaleString(undefined, { maximumFractionDigits: 8 })}</span>
                    {wallet && (
                      <button
                        onClick={() => setSelectedWallet(selectedWallet === balance.currency ? null : balance.currency)}
                        className="text-brand hover:underline"
                      >
                        {selectedWallet === balance.currency ? 'Hide' : 'Deposit Address'}
                      </button>
                    )}
                  </div>
                  {selectedWallet === balance.currency && wallet && (
                    <div className="mt-3 p-3 bg-[hsl(220,13%,7%)] rounded-lg">
                      <p className="text-xs text-[hsl(220,10%,50%)] mb-1">Deposit Address ({balance.currency})</p>
                      <p className="font-mono text-xs break-all text-[hsl(220,10%,70%)] select-all">{wallet.address}</p>
                      <p className="text-xs text-[hsl(220,10%,50%)] mt-1">
                        Testnet only. Send {balance.currency} to this address to fund your account.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
