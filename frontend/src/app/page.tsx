'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import { useWebSocket } from '../hooks/useWebSocket';
import { TickerBar } from '../components/trading/TickerBar';
import { Header } from '../components/layout/Header';
import { usePriceStore } from '../store/trading';
import { TRADING_PAIRS, type TradingPair } from '@/types/shared';

/* ── Helpers ─────────────────────────────────────────────────── */

const CRYPTO_SYMBOL: Record<string, string> = {
  BTC: '₿', ETH: 'Ξ', BNB: '🟡', SOL: '◎', XRP: '✕', ADA: '⬡', DOGE: 'Ð',
};

function cryptoIcon(pair: string): string {
  const base = pair.split('/')[0];
  return CRYPTO_SYMBOL[base] || base;
}

function formatPriceDisplay(pair: TradingPair, price: string | undefined): string {
  if (!price) return '—';
  const n = parseFloat(price);
  if (!n) return '—';
  if (pair === 'DOGE/USDT') return n.toFixed(5);
  if (pair.endsWith('/USDT')) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toFixed(6);
}

/* ── Count-up hook ───────────────────────────────────────────── */

function useCountUp(target: number, duration: number, start: boolean): number {
  const [val, setVal] = useState(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!start) return;
    const step = target / (duration / 16);
    let current = 0;
    const animate = () => {
      current += step;
      if (current >= target) { setVal(target); return; }
      setVal(Math.floor(current));
      frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration, start]);

  return val;
}

function CountUpStat({ value, label, suffix, decimals }: { value: number; label: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const count = useCountUp(value, 2000, visible);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const display = decimals !== undefined ? count.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : count.toLocaleString();

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-white mb-1 tabular-nums">
        {display}{suffix || ''}
      </div>
      <div className="text-xs text-[#848E9C] uppercase tracking-widest">{label}</div>
    </div>
  );
}

/* ── Sparkline mini-component ────────────────────────────────── */

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 100; const h = 28;
  const step = w / (points.length - 1);
  const d = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const lastY = h - ((points[points.length - 1] - min) / range) * (h - 4) - 2;
  const fill = `${d} L${w},${h} L0,${h} Z`;
  const isUp = points[points.length - 1] >= points[0];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7" preserveAspectRatio="none">
      <path d={fill} fill={isUp ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)'} />
      <path d={d} fill="none" stroke={isUp ? '#0ECB81' : '#F6465D'} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ── BTC price card ───────────────────────────────────────────── */

function LivePriceCard() {
  const data = usePriceStore((s) => s.prices['BTC/USDT']);
  const [sparkPoints, setSparkPoints] = useState<number[]>([]);

  useEffect(() => {
    const base = data?.price ? parseFloat(data.price) : 76000;
    const pts: number[] = [];
    let cur = base * 0.96;
    for (let i = 0; i < 20; i++) {
      cur += (Math.random() - 0.42) * (base * 0.006);
      if (cur < base * 0.94) cur = base * 0.94;
      pts.push(cur);
    }
    setSparkPoints(pts);
  }, []);

  const price = data?.price;
  const change = data ? parseFloat(data.changePercent24h) : 0;
  const isPositive = change >= 0;

  return (
    <div className="bg-[#1E2329]/90 backdrop-blur border border-[#2B3139] rounded-xl p-5 w-[260px] shadow-2xl animate-float">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">₿</span>
        <span className="text-sm font-semibold text-white">BTC / USDT</span>
        <span className={`text-[11px] font-medium ml-auto px-1.5 py-0.5 rounded ${isPositive ? 'text-[#0ECB81] bg-[#0ECB81]/10' : 'text-[#F6465D] bg-[#F6465D]/10'}`}>
          {data ? `${isPositive ? '+' : ''}${change.toFixed(2)}%` : '—'}
        </span>
      </div>
      <div className="text-2xl font-bold text-white font-mono mb-2 tracking-tight">
        {price ? `$${parseFloat(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (
          <span className="inline-block w-28 h-7 bg-[#2B3139] rounded animate-pulse align-middle" />
        )}
      </div>
      {sparkPoints.length > 0 ? (
        <Sparkline points={sparkPoints} />
      ) : (
        <div className="w-full h-7 bg-[#2B3139] rounded animate-pulse" />
      )}
    </div>
  );
}

/* ── Features data ───────────────────────────────────────────── */

const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: 'Secure Assets',
    description: 'Multi-layer HD wallet infrastructure with cold storage and enterprise-grade encryption keeps your funds safe at all times.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: 'Lightning Fast',
    description: 'Sub-millisecond matching engine processes thousands of orders per second so you never miss an opportunity.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: 'Low Fees',
    description: 'Trading fees from just 0.1% with zero deposit fees. The more volume you trade, the lower your fees become.',
  },
];

/* ── Footer data ─────────────────────────────────────────────── */

const footerColumns = [
  {
    heading: 'Products',
    links: ['Spot Trading', 'Wallet', 'API', 'Mobile App'],
  },
  {
    heading: 'Company',
    links: ['About Us', 'Careers', 'Security', 'Press Kit'],
  },
  {
    heading: 'Support',
    links: ['Help Center', 'Contact Us', 'API Docs', 'System Status'],
  },
  {
    heading: 'Community',
    links: ['Twitter', 'Telegram', 'Discord', 'Blog'],
  },
];

/* ── Main page ───────────────────────────────────────────────── */

export default function HomePage() {
  const { user } = useAuth();
  useWebSocket();
  const prices = usePriceStore((s) => s.prices);

  const [heroVisible, setHeroVisible] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);

  // Volume cache — fetched once from REST on mount
  const volumeCache = useRef<Record<string, string>>({});
  const [volumes, setVolumes] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function fetchAllVolumes() {
      const results: Record<string, string> = {};
      for (const pair of TRADING_PAIRS) {
        try {
          const symbol = pair.replace('/', '').toLowerCase();
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/market/ticker/24hr?symbol=${symbol}`
          );
          const json = await res.json();
          if (json.success && json.data?.volume) {
            results[pair] = json.data.volume;
          }
        } catch { /* skip */ }
      }
      if (!cancelled) {
        volumeCache.current = results;
        setVolumes(results);
      }
    }
    fetchAllVolumes();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col overflow-x-hidden">
      <Header />

      {/* ════════════════ HERO ════════════════ */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Radial glow behind hero text */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(240,185,11,0.08)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 w-full relative z-10 py-20">
          <div className="grid lg:grid-cols-2 items-center gap-12 lg:gap-16">
            {/* Left — text */}
            <div className={`transition-all duration-1000 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
                <span className="text-white">The World&apos;s </span>
                <span className="bg-gradient-to-r from-[#F0B90B] to-[#FCD535] bg-clip-text text-transparent">Leading</span>
                <br />
                <span className="text-white">Crypto Exchange</span>
              </h1>

              <p className="text-base md:text-lg text-[#848E9C] max-w-xl mb-10 leading-relaxed">
                Trade Bitcoin, Ethereum and 9+ cryptocurrencies with professional tools, deep liquidity and institutional-grade security.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                {user ? (
                  <Link
                    href="/trade"
                    className="px-8 py-3.5 bg-[#F0B90B] hover:bg-[#F8D33E] text-black font-semibold rounded-lg text-base transition-colors inline-flex items-center justify-center gap-2"
                  >
                    Start Trading
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </Link>
                ) : (
                  <Link
                    href="/register"
                    className="px-8 py-3.5 bg-[#F0B90B] hover:bg-[#F8D33E] text-black font-semibold rounded-lg text-base transition-colors inline-flex items-center justify-center gap-2"
                  >
                    Get Started
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </Link>
                )}
                <Link
                  href={user ? '/trade' : '/login'}
                  className="px-8 py-3.5 border border-[#2B3139] text-white font-medium rounded-lg text-base hover:bg-[#1E2329] hover:border-[#474D57] transition-colors inline-flex items-center justify-center"
                >
                  View Markets
                </Link>
              </div>
            </div>

            {/* Right — animated card */}
            <div className={`hidden lg:flex justify-center transition-all duration-1000 delay-300 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <LivePriceCard />
            </div>
          </div>
        </div>

        {/* Bottom fade to next section */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0B0E11] to-transparent pointer-events-none" />
      </section>

      {/* ════════════════ LIVE TICKER ════════════════ */}
      <TickerBar />

      {/* ════════════════ MARKETS TABLE ════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-20 w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white">Markets</h2>
          <Link href={user ? '/trade' : '/login'} className="text-sm text-[#848E9C] hover:text-[#F0B90B] transition-colors flex items-center gap-1">
            View All
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-[#474D57] uppercase tracking-wider border-b border-[#2B3139]">
                <th className="text-left py-3 px-3 font-medium">Name</th>
                <th className="text-right py-3 px-3 font-medium">Price</th>
                <th className="text-right py-3 px-3 font-medium">24h Change</th>
                <th className="text-right py-3 px-3 font-medium hidden md:table-cell">24h Volume</th>
                <th className="text-right py-3 px-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {TRADING_PAIRS.map((pair) => {
                const data = prices[pair];
                const hasPrice = data?.price && parseFloat(data.price) > 0;
                const change = data ? parseFloat(data.changePercent24h) : 0;
                const isPositive = change >= 0;
                const restVolume = volumes[pair];
                const wsVolume = data?.volume24h && parseFloat(data.volume24h) > 0 ? data.volume24h : null;
                const displayVolume = restVolume || wsVolume;
                const hasVolume = !!displayVolume;
                const volNum = displayVolume ? parseFloat(displayVolume) : 0;

                return (
                  <tr
                    key={pair}
                    className="border-b border-[#2B3139]/50 hover:bg-[#1E2329]/50 transition-colors group"
                  >
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-[#1E2329] flex items-center justify-center text-sm font-bold text-[#F0B90B]">
                          {cryptoIcon(pair)}
                        </span>
                        <span className="font-semibold text-white text-sm">{pair}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-sm tabular-nums">
                      {hasPrice ? (
                        <span className="text-white">{formatPriceDisplay(pair, data!.price)}</span>
                      ) : (
                        <span className="inline-block w-20 h-4 bg-[#1E2329] rounded animate-pulse align-middle" />
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-sm tabular-nums">
                      {data ? (
                        <span className={isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                          {isPositive ? '+' : ''}{change.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="inline-block w-14 h-4 bg-[#1E2329] rounded animate-pulse align-middle" />
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right text-[#848E9C] text-sm hidden md:table-cell">
                      {hasVolume ? (
                        `$${(volNum / 1e6).toFixed(volNum >= 1e6 ? 1 : 2)}M`
                      ) : (
                        <span className="inline-block w-14 h-4 bg-[#1E2329] rounded animate-pulse align-middle" />
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Link
                        href={user ? `/trade?pair=${pair}` : '/login'}
                        className="text-[11px] font-medium px-3 py-1.5 rounded bg-[#1E2329] text-[#848E9C] group-hover:bg-[#F0B90B] group-hover:text-black transition-all"
                      >
                        Trade
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ════════════════ FEATURES ════════════════ */}
      <section className="border-t border-[#2B3139] bg-[#0B0E11]/50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why traders choose <span className="bg-gradient-to-r from-[#F0B90B] to-[#FCD535] bg-clip-text text-transparent">YellowCEX</span>
            </h2>
            <p className="text-[#848E9C] max-w-lg mx-auto">
              Everything you need to trade cryptocurrencies at a professional level.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="bg-[#0B0E11] border border-[#2B3139] rounded-xl p-8 hover:border-[#F0B90B]/40 transition-all duration-300 group hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-[#1E2329] flex items-center justify-center mb-5 group-hover:bg-[#F0B90B]/10 transition-colors text-[#F0B90B]">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{feat.title}</h3>
                <p className="text-sm text-[#848E9C] leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ STATS BAR ════════════════ */}
      <section className="border-y border-[#2B3139] bg-[#1E2329]/30">
        <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
          <CountUpStat value={120000} label="Registered Users" />
          <CountUpStat value={2400} label="24h Volume" suffix="M+" />
          <CountUpStat value={7} label="Trading Pairs" />
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white mb-1 tabular-nums">99.99%</div>
            <div className="text-xs text-[#848E9C] uppercase tracking-widest">Uptime</div>
          </div>
        </div>
      </section>

      {/* ════════════════ APP DOWNLOAD ════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-[#1E2329] border border-[#2B3139] rounded-2xl p-10 md:p-16 flex flex-col md:flex-row items-center gap-10">
          {/* Left — QR code */}
          <div className="flex-shrink-0">
            <div className="w-40 h-40 bg-white rounded-xl p-3 flex items-center justify-center">
              {/* QR placeholder — styled grid */}
              <div className="grid grid-cols-7 gap-1 w-full h-full">
                {Array.from({ length: 49 }).map((_, i) => {
                  const row = Math.floor(i / 7);
                  const col = i % 7;
                  const filled = (row < 2 || row > 4 || col < 2 || col > 4) &&
                    (row + col) % 2 === 0 &&
                    !(row === 0 && col === 6) &&
                    !(row === 6 && col === 0);
                  return (
                    <div
                      key={i}
                      className={`rounded-sm ${filled ? 'bg-black' : 'bg-transparent'}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right — text */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Trade on the go</h2>
            <p className="text-[#848E9C] mb-6 max-w-md">
              Download the YellowCEX mobile app and never miss a trading opportunity. Available for iOS and Android.
            </p>
            <div className="flex gap-3">
              <div className="px-5 py-2.5 bg-[#0B0E11] border border-[#2B3139] rounded-lg text-sm text-white font-medium inline-flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                App Store
              </div>
              <div className="px-5 py-2.5 bg-[#0B0E11] border border-[#2B3139] rounded-lg text-sm text-white font-medium inline-flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 0 1 0 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/></svg>
                Google Play
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer className="border-t border-[#2B3139] bg-[#0B0E11]/80">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand column */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#F0B90B] rounded-lg flex items-center justify-center">
                  <span className="text-black font-extrabold text-sm">Y</span>
                </div>
                <span className="text-base font-bold text-white">YellowCEX</span>
              </div>
              <p className="text-xs text-[#848E9C] leading-relaxed">
                Professional cryptocurrency exchange. Trade with confidence.
              </p>
            </div>

            {footerColumns.map((col) => (
              <div key={col.heading}>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">{col.heading}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-[#848E9C] hover:text-[#F0B90B] transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-[#2B3139] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              {/* Social icons */}
              <a href="#" className="text-[#474D57] hover:text-[#F0B90B] transition-colors" aria-label="Twitter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" className="text-[#474D57] hover:text-[#F0B90B] transition-colors" aria-label="Telegram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.66-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.41-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.98-3.43 3.8-1.58 4.59-1.86 5.11-1.87.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/></svg>
              </a>
              <a href="#" className="text-[#474D57] hover:text-[#F0B90B] transition-colors" aria-label="Discord">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              </a>
              <a href="#" className="text-[#474D57] hover:text-[#F0B90B] transition-colors" aria-label="GitHub">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
              </a>
            </div>
            <p className="text-xs text-[#474D57]">
              &copy; {new Date().getFullYear()} YellowCEX. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Float animation keyframes */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
