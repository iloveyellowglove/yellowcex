'use client';

import React from 'react';
import { useOrderBookStore } from '../../store/trading';
import type { TradingPair } from '@/types/shared';

interface Props {
  pair: TradingPair;
}

function formatNumber(n: string, decimals = 2): string {
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
  return num.toFixed(decimals);
}

export function OrderBook({ pair }: Props) {
  const { bids, asks } = useOrderBookStore();

  const maxTotal = Math.max(
    ...bids.map((b) => parseFloat(b[1])),
    ...asks.map((a) => parseFloat(a[1])),
    1
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center px-3 py-2 border-b border-[hsl(220,13%,15%)]">
        <span className="text-xs font-medium text-[hsl(220,10%,60%)]">Order Book</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-3 px-3 py-1 text-[10px] text-[hsl(220,10%,40%)] uppercase tracking-wider">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (sell orders) - reversed */}
      <div className="flex-1 overflow-y-auto">
        {asks.slice(0, 12).reverse().map((ask, i) => {
          const depth = (parseFloat(ask[1]) / maxTotal) * 100;
          return (
            <div key={`ask-${i}`} className="grid grid-cols-3 px-3 py-0.5 text-xs relative group">
              <div
                className="absolute inset-y-0 right-0 bg-red-900/10"
                style={{ width: `${depth}%` }}
              />
              <span className="relative text-red-400 font-mono">{formatNumber(ask[0])}</span>
              <span className="relative text-right font-mono text-[hsl(220,10%,80%)]">{formatNumber(ask[1])}</span>
              <span className="relative text-right font-mono text-[hsl(220,10%,50%)]">{formatNumber(ask[1])}</span>
            </div>
          );
        })}
      </div>

      {/* Spread */}
      <div className="px-3 py-1 text-xs text-center text-[hsl(220,10%,50%)] border-y border-[hsl(220,13%,15%)]">
        Spread: {asks.length > 0 && bids.length > 0
          ? formatNumber((parseFloat(asks[0][0]) - parseFloat(bids[0][0])).toString(), 8)
          : '—'}
      </div>

      {/* Bids (buy orders) */}
      <div className="flex-1 overflow-y-auto">
        {bids.slice(0, 12).map((bid, i) => {
          const depth = (parseFloat(bid[1]) / maxTotal) * 100;
          return (
            <div key={`bid-${i}`} className="grid grid-cols-3 px-3 py-0.5 text-xs relative group">
              <div
                className="absolute inset-y-0 right-0 bg-green-900/10"
                style={{ width: `${depth}%` }}
              />
              <span className="relative text-green-400 font-mono">{formatNumber(bid[0])}</span>
              <span className="relative text-right font-mono text-[hsl(220,10%,80%)]">{formatNumber(bid[1])}</span>
              <span className="relative text-right font-mono text-[hsl(220,10%,50%)]">{formatNumber(bid[1])}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
