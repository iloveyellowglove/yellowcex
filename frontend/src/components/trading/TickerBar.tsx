'use client';

import React from 'react';
import { usePriceStore } from '../../store/trading';
import { TRADING_PAIRS } from '@/types/shared';
import type { TradingPair } from '@/types/shared';

function formatPrice(pair: TradingPair, price: string): string {
  const num = parseFloat(price);
  if (!num) return '—';
  if (pair === 'DOGE/USDT') return num.toFixed(5);
  if (pair === 'BTC/ETH') return num.toFixed(6);
  if (pair.endsWith('/USDT')) return num.toFixed(2);
  return num.toFixed(4);
}

export function TickerBar({ compact }: { compact?: boolean }) {
  const prices = usePriceStore((s) => s.prices);

  return (
    <div className="w-full bg-[#0B0E11] border-b border-[#2B3139] overflow-hidden">
      <div className="flex animate-ticker-scroll">
        {[...TRADING_PAIRS, ...TRADING_PAIRS].map((pair, i) => {
          const data = prices[pair];
          const change = data ? parseFloat(data.changePercent24h) : 0;
          const isPositive = change >= 0;

          return (
            <div
              key={`${pair}-${i}`}
              className={`flex items-center gap-1.5 py-2 px-4 text-xs shrink-0 border-r border-[#2B3139] ${
                compact ? 'py-1.5' : ''
              }`}
            >
              <span className="font-semibold text-white text-[11px]">{pair}</span>
              <span className={`font-mono ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {data ? formatPrice(pair, data.price) : '—'}
              </span>
              <span
                className={`text-[10px] font-medium px-1 py-0.5 rounded ${
                  isPositive
                    ? 'text-[#0ECB81] bg-[#0ECB81]/10'
                    : 'text-[#F6465D] bg-[#F6465D]/10'
                }`}
              >
                {data ? `${isPositive ? '+' : ''}${change.toFixed(2)}%` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .animate-ticker-scroll {
          display: flex;
          width: max-content;
          animation: ticker-scroll 40s linear infinite;
        }
        .animate-ticker-scroll:hover {
          animation-play-state: paused;
        }
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

export function TickerBarSimple() {
  const prices = usePriceStore((s) => s.prices);

  return (
    <div className="w-full bg-[#0B0E11] border-b border-[#2B3139] overflow-x-auto">
      <div className="flex">
        {TRADING_PAIRS.map((pair) => {
          const data = prices[pair];
          const change = data ? parseFloat(data.changePercent24h) : 0;
          const isPositive = change >= 0;

          return (
            <div
              key={pair}
              className="flex items-center gap-2 py-2.5 px-4 text-xs shrink-0 border-r border-[#2B3139] whitespace-nowrap"
            >
              <span className="font-semibold text-white text-[11px]">{pair}</span>
              <span className={`font-mono ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {data ? formatPrice(pair, data.price) : '—'}
              </span>
              <span
                className={`text-[10px] font-medium px-1 py-0.5 rounded ${
                  isPositive
                    ? 'text-[#0ECB81] bg-[#0ECB81]/10'
                    : 'text-[#F6465D] bg-[#F6465D]/10'
                }`}
              >
                {data ? `${isPositive ? '+' : ''}${change.toFixed(2)}%` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
