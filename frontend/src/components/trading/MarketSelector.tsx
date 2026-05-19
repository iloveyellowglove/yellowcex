'use client';

import React from 'react';
import { useTradeFormStore, usePriceStore } from '../../store/trading';
import { TRADING_PAIRS } from '@/types/shared';

function formatPrice(price: string | undefined, pair: string): string {
  if (!price) return '—';
  const num = parseFloat(price);
  if (!num) return '—';
  if (pair.startsWith('DOGE')) return num.toFixed(5);
  if (pair.includes('/ETH') && !pair.startsWith('ETH')) return num.toFixed(6);
  if (pair.endsWith('/USDT')) return num.toFixed(2);
  return num.toFixed(4);
}

export function MarketSelector() {
  const pair = useTradeFormStore((s) => s.pair);
  const setPair = useTradeFormStore((s) => s.setPair);
  const prices = usePriceStore((s) => s.prices);

  return (
    <div className="h-10 bg-[#0B0E11] border-b border-[#2B3139] flex items-center shrink-0 overflow-x-auto">
      {TRADING_PAIRS.map((p) => {
        const active = p === pair;
        const data = prices[p];
        const change = data ? parseFloat(data.changePercent24h) : 0;
        const isPositive = change >= 0;

        return (
          <button
            key={p}
            onClick={() => setPair(p)}
            className={`h-full px-3 flex items-center gap-2 text-xs font-mono shrink-0 border-r border-[#2B3139] transition-colors ${
              active
                ? 'bg-[#1E2329] text-white border-b-2 border-b-brand'
                : 'text-[#848E9C] hover:text-white hover:bg-[#1E2329] border-b-2 border-b-transparent'
            }`}
          >
            <span className="font-semibold text-[11px]">{p}</span>
            <span className="text-[11px]">{formatPrice(data?.price, p)}</span>
            <span
              className={`text-[10px] font-medium px-1 py-0.5 rounded ${
                isPositive
                  ? 'text-[#0ECB81] bg-[#0ECB81]/10'
                  : 'text-[#F6465D] bg-[#F6465D]/10'
              }`}
            >
              {data ? `${isPositive ? '+' : ''}${change.toFixed(2)}%` : '—'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
