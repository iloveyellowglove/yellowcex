'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Header } from '../../components/layout/Header';
import { apiGet } from '../../lib/api';
import { Copy, Eye, EyeOff, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { Wallet, Balance } from '@/types/shared';

const CURRENCY_ICONS: Record<string, string> = {
  BTC: '₿',
  ETH: 'Ξ',
  USDT: '₮',
  USDC: '₵',
  SOL: '◎',
  BNB: '⬡',
  XRP: '✕',
  ADA: '₳',
  DOGE: 'Ð',
  MATIC: '◆',
};

const CURRENCY_COLORS: Record<string, string> = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  USDT: '#26A17B',
  USDC: '#2775CA',
  SOL: '#9945FF',
  BNB: '#F0B90B',
  XRP: '#23292F',
  ADA: '#0033AD',
  DOGE: '#C2A633',
  MATIC: '#8247E5',
};

export default function WalletsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [showAddress, setShowAddress] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

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

  const copyAddress = async (address: string, currency: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(currency);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = address;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(currency);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  if (!user) return null;

  const totalUsdt = balances.reduce((sum, b) => {
    // Simplified: sum of all available balances (in a real app you'd convert via price feed)
    return sum + parseFloat(b.available);
  }, 0);

  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col">
      <Header />
      <div className="max-w-5xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Wallets</h1>
            <p className="text-sm text-[#848E9C] mt-1">Manage your crypto assets</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#848E9C] uppercase tracking-wider">Total Balance</div>
            <div className="text-xl font-bold text-white font-mono">
              ≈ ${totalUsdt.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
          </div>
        ) : balances.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-[#1E2329] flex items-center justify-center mx-auto mb-4">
              <ArrowDownLeft size={24} className="text-[#848E9C]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No wallets yet</h3>
            <p className="text-sm text-[#848E9C] max-w-sm mx-auto">
              Start trading to generate deposit addresses, or fund your account via external transfer.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {balances.map((balance) => {
              const wallet = wallets.find((w) => w.currency === balance.currency);
              const isSelected = selectedCurrency === balance.currency;
              const color = CURRENCY_COLORS[balance.currency] || '#848E9C';
              const icon = CURRENCY_ICONS[balance.currency] || '●';

              return (
                <div
                  key={balance.currency}
                  className="bg-[#1E2329] border border-[#2B3139] rounded-xl overflow-hidden hover:border-[#474D57] transition-colors"
                >
                  {/* Top row */}
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                        style={{ backgroundColor: `${color}15`, color }}
                      >
                        {icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-lg">{balance.currency}</span>
                          <span className="text-xs text-[#848E9C] uppercase">Testnet</span>
                        </div>
                        {wallet && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-[#474D57] font-mono">
                              {showAddress[balance.currency]
                                ? wallet.address.slice(0, 12) + '...' + wallet.address.slice(-8)
                                : '••••••••••••••••••••••'}
                            </span>
                            <button
                              onClick={() =>
                                setShowAddress((prev) => ({
                                  ...prev,
                                  [balance.currency]: !prev[balance.currency],
                                }))
                              }
                              className="text-[#848E9C] hover:text-white transition-colors"
                            >
                              {showAddress[balance.currency] ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button
                              onClick={() => wallet && copyAddress(wallet.address, balance.currency)}
                              className="text-[#848E9C] hover:text-white transition-colors"
                            >
                              {copied === balance.currency ? (
                                <span className="text-[10px] text-[#0ECB81]">Copied!</span>
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-semibold text-white">
                        {parseFloat(balance.available).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                      </div>
                      <div className="text-xs text-[#848E9C]">
                        {parseFloat(balance.locked) > 0 && (
                          <span>Locked: {parseFloat(balance.locked).toLocaleString(undefined, { maximumFractionDigits: 8 })}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 border-t border-[#2B3139]">
                    <button
                      onClick={() => setSelectedCurrency(isSelected ? null : balance.currency)}
                      className={`py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'text-brand bg-brand/5'
                          : 'text-[#848E9C] hover:text-white hover:bg-[#2B3139]'
                      }`}
                    >
                      <ArrowDownLeft size={14} />
                      Deposit
                    </button>
                    <button
                      className="py-2.5 text-xs font-medium text-[#848E9C] hover:text-white hover:bg-[#2B3139] transition-colors flex items-center justify-center gap-1.5 border-l border-[#2B3139]"
                    >
                      <ArrowUpRight size={14} />
                      Withdraw
                    </button>
                  </div>

                  {/* Deposit info panel */}
                  {isSelected && wallet && (
                    <div className="px-5 pb-5 animate-fade-in">
                      <div className="bg-[#0B0E11] border border-[#2B3139] rounded-lg p-4">
                        <p className="text-xs text-[#848E9C] mb-2">
                          Send only {balance.currency} to this address. Sending any other asset will result in permanent loss.
                        </p>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex-1 bg-[#1E2329] rounded-lg px-3 py-2.5">
                            <p className="font-mono text-xs text-white break-all select-all">{wallet.address}</p>
                          </div>
                          <button
                            onClick={() => copyAddress(wallet.address, balance.currency)}
                            className="px-3 py-2.5 bg-brand text-black rounded-lg text-xs font-medium hover:bg-[#F8D33E] transition-colors shrink-0"
                          >
                            {copied === balance.currency ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        {/* QR placeholder */}
                        <div className="w-32 h-32 bg-white rounded-lg mx-auto flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-24 h-24 border-4 border-black mx-auto grid grid-cols-7 grid-rows-7 gap-px p-1">
                              {Array.from({ length: 49 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-full h-full ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-center text-[10px] text-[#474D57] mt-2">
                          QR code placeholder — scan to deposit
                        </p>
                      </div>
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
