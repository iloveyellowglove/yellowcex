'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import { useWebSocket } from '../hooks/useWebSocket';
import { TickerBar } from '../components/trading/TickerBar';
import { Header } from '../components/layout/Header';
import {
  Shield,
  Zap,
  Droplets,
  Percent,
  TrendingUp,
  Users,
  Activity,
  ArrowRight,
  Check,
} from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Secure Custody',
    description: 'HD wallet infrastructure with multi-layer security. Your assets are protected with enterprise-grade encryption.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Sub-millisecond order matching engine. Execute trades instantly with real-time market data.',
  },
  {
    icon: Droplets,
    title: 'Deep Liquidity',
    description: 'Aggregated liquidity from major markets ensures minimal slippage on every trade.',
  },
  {
    icon: Percent,
    title: 'Low Fees',
    description: 'Competitive trading fees starting at 0.1%. The more you trade, the less you pay.',
  },
];

const stats = [
  { label: 'Registered Users', value: '10,000+', icon: Users },
  { label: '24h Volume', value: '$2.4B', icon: Activity },
  { label: 'Trading Pairs', value: '9', icon: TrendingUp },
  { label: 'Uptime', value: '99.99%', icon: Shield },
];

const markets = [
  { pair: 'BTC/USDT', volume: '$892M', change: '+2.34%', positive: true },
  { pair: 'ETH/USDT', volume: '$456M', change: '+1.87%', positive: true },
  { pair: 'BNB/USDT', volume: '$234M', change: '-0.45%', positive: false },
  { pair: 'SOL/USDT', volume: '$189M', change: '+5.23%', positive: true },
  { pair: 'XRP/USDT', volume: '$145M', change: '+0.89%', positive: true },
  { pair: 'ADA/USDT', volume: '$98M', change: '-1.23%', positive: false },
  { pair: 'DOGE/USDT', volume: '$76M', change: '+3.45%', positive: true },
  { pair: 'MATIC/USDT', volume: '$54M', change: '-0.67%', positive: false },
  { pair: 'BTC/ETH', volume: '$32M', change: '+0.12%', positive: true },
];

export default function HomePage() {
  const { user } = useAuth();
  useWebSocket();

  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col">
      <Header />

      {/* Ticker bar */}
      <TickerBar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 text-center relative">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6">
            Trade Crypto <br className="sm:hidden" />
            <span className="text-brand">Without Compromise</span>
          </h1>
          <p className="text-base md:text-lg text-[#848E9C] max-w-2xl mx-auto mb-10 leading-relaxed">
            Professional-grade exchange with instant execution, deep liquidity, and
            custodial HD wallets. Start trading Bitcoin, Ethereum, and more in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link
                href="/trade"
                className="px-8 py-3.5 bg-brand text-black font-semibold rounded-lg text-base hover:bg-[#F8D33E] transition-colors inline-flex items-center justify-center gap-2"
              >
                Launch Platform <ArrowRight size={18} />
              </Link>
            ) : (
              <Link
                href="/register"
                className="px-8 py-3.5 bg-brand text-black font-semibold rounded-lg text-base hover:bg-[#F8D33E] transition-colors inline-flex items-center justify-center gap-2"
              >
                Get Started Free <ArrowRight size={18} />
              </Link>
            )}
            <Link
              href={user ? '/trade' : '/login'}
              className="px-8 py-3.5 bg-[#1E2329] text-white font-medium rounded-lg text-base hover:bg-[#2B3139] transition-colors border border-[#2B3139]"
            >
              View Markets
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-[#2B3139] bg-[#0B0E11]/50">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                <Icon size={20} className="text-brand mx-auto mb-2" />
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-xs text-[#848E9C] uppercase tracking-wider">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Built for <span className="text-brand">Serious Traders</span>
          </h2>
          <p className="text-[#848E9C] max-w-xl mx-auto">
            Everything you need to trade cryptocurrencies at a professional level.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-6 hover:border-[#F0B90B]/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center mb-4 group-hover:bg-brand/20 transition-colors">
                  <Icon size={20} className="text-brand" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feat.title}</h3>
                <p className="text-sm text-[#848E9C] leading-relaxed">{feat.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Markets */}
      <section className="bg-[#0B0E11]/50 border-t border-[#2B3139]">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Popular <span className="text-brand">Markets</span>
            </h2>
            <p className="text-[#848E9C]">Trade the most popular cryptocurrency pairs.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-3 max-w-4xl mx-auto">
            {markets.map((m) => (
              <Link
                key={m.pair}
                href={user ? `/trade?pair=${m.pair}` : '/login'}
                className="flex items-center justify-between px-4 py-3 bg-[#1E2329] border border-[#2B3139] rounded-lg hover:border-brand/30 transition-colors group"
              >
                <div>
                  <span className="font-mono font-semibold text-white text-sm">{m.pair}</span>
                  <p className="text-[10px] text-[#848E9C]">Vol. {m.volume}</p>
                </div>
                <span className={`text-xs font-mono font-medium ${m.positive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {m.change}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="bg-gradient-to-r from-brand/10 via-brand/5 to-brand/10 border border-brand/20 rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to start trading?
          </h2>
          <p className="text-[#848E9C] mb-8 max-w-lg mx-auto">
            Join thousands of traders on YellowCEX. Create your account and start trading in minutes.
          </p>
          {user ? (
            <Link
              href="/trade"
              className="px-8 py-3.5 bg-brand text-black font-semibold rounded-lg text-base hover:bg-[#F8D33E] transition-colors inline-flex items-center gap-2"
            >
              Go to Trading <ArrowRight size={18} />
            </Link>
          ) : (
            <Link
              href="/register"
              className="px-8 py-3.5 bg-brand text-black font-semibold rounded-lg text-base hover:bg-[#F8D33E] transition-colors inline-flex items-center gap-2"
            >
              Create Free Account <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2B3139] bg-[#0B0E11]/50">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center">
                <span className="text-black font-bold text-xs">Y</span>
              </div>
              <span className="text-sm font-semibold text-white">YellowCEX</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-[#848E9C]">
              <span>Testnet by default — set NETWORK=mainnet to trade live</span>
              <span className="w-1 h-1 rounded-full bg-[#2B3139]" />
              <span>© 2026 YellowCEX</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
