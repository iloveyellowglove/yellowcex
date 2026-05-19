'use client';

import React, { useMemo } from 'react';
import { useOrderBookStore } from '../../store/trading';
import type { TradingPair } from '@/types/shared';

interface Props {
  pair: TradingPair;
}

function formatNumber(n: string, decimals = 2): string {
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  if (num >= 1) return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return num.toFixed(decimals);
}

export function OrderBook({ pair }: Props) {
  const { bids, asks } = useOrderBookStore();

  const { maxBidTotal, maxAskTotal, cumulativeBids, cumulativeAsks } = useMemo(() => {
    let bidAcc = 0;
    let askAcc = 0;
    const cBids: number[] = [];
    const cAsks: number[] = [];

    for (const b of bids) {
      bidAcc += parseFloat(b[1]);
      cBids.push(bidAcc);
    }
    for (const a of asks) {
      askAcc += parseFloat(a[1]);
      cAsks.push(askAcc);
    }

    const maxBid = cBids.length > 0 ? cBids[cBids.length - 1] : 1;
    const maxAsk = cAsks.length > 0 ? cAsks[cAsks.length - 1] : 1;
    const globalMax = Math.max(maxBid, maxAsk, 1);

    return {
      maxBidTotal: globalMax,
      maxAskTotal: globalMax,
      cumulativeBids: cBids,
      cumulativeAsks: cAsks,
    };
  }, [bids, asks]);

  const displayAsks = asks.slice(0, 14).reverse();
  const displayBids = bids.slice(0, 14);

  const spread = asks.length > 0 && bids.length > 0
    ? parseFloat(asks[0][0]) - parseFloat(bids[0][0])
    : 0;
  const spreadPercent = asks.length > 0 && bids.length > 0
    ? (spread / parseFloat(asks[0][0])) * 100
    : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center px-3 py-2 border-b border-[#2B3139] shrink-0">
        <span className="text-xs font-medium text-[#848E9C]">Order Book</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-3 px-3 py-1 text-[10px] text-[#474D57] uppercase tracking-wider shrink-0">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (sell orders) */}
      <div className="flex-1 overflow-y-auto flex flex-col-reverse">
        {displayAsks.map((ask, i) => {
          const actualIndex = displayAsks.length - 1 - i;
          const total = cumulativeAsks[actualIndex + (asks.length - displayAsks.length)] ?? parseFloat(ask[1]);
          const depth = (total / maxAskTotal) * 100;
          return (
            <div key={`ask-${i}`} className="grid grid-cols-3 px-3 py-[1px] text-xs relative group">
              <div
                className="absolute inset-y-0 right-0 bg-[#F6465D]/10"
                style={{ width: `${depth}%` }}
              />
              <span className="relative text-[#F6465D] font-mono text-[11px]">{formatNumber(ask[0], 2)}</span>
              <span className="relative text-right font-mono text-[11px] text-[#EAECEF]">{formatNumber(ask[1], 4)}</span>
              <span className="relative text-right font-mono text-[11px] text-[#848E9C]">{formatNumber(total.toString(), 4)}</span>
            </div>
          );
        })}
      </div>

      {/* Spread */}
      <div className="px-3 py-1.5 text-[11px] text-center text-[#848E9C] border-y border-[#2B3139] shrink-0">
        <span className="font-mono text-white">{formatNumber(spread.toString(), 6)}</span>
        {spreadPercent > 0 && (
          <span className="text-[10px] ml-1">({spreadPercent.toFixed(4)}%)</span>
        )}
      </div>

      {/* Bids (buy orders) */}
      <div className="flex-1 overflow-y-auto">
        {displayBids.map((bid, i) => {
          const total = cumulativeBids[i] ?? parseFloat(bid[1]);
          const depth = (total / maxBidTotal) * 100;
          return (
            <div key={`bid-${i}`} className="grid grid-cols-3 px-3 py-[1px] text-xs relative group">
              <div
                className="absolute inset-y-0 right-0 bg-[#0ECB81]/10"
                style={{ width: `${depth}%` }}
              />
              <span className="relative text-[#0ECB81] font-mono text-[11px]">{formatNumber(bid[0], 2)}</span>
              <span className="relative text-right font-mono text-[11px] text-[#EAECEF]">{formatNumber(bid[1], 4)}</span>
              <span className="relative text-right font-mono text-[11px] text-[#848E9C]">{formatNumber(total.toString(), 4)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
