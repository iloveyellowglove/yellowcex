'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useOrderBookStore } from '../../store/trading';
import { PAIR_TO_BINANCE_SYMBOL, type TradingPair } from '@/types/shared';

interface Props {
  pair: TradingPair;
}

interface DepthData {
  bids: [string, string][];
  asks: [string, string][];
}

function binanceSymbol(pair: TradingPair): string {
  return PAIR_TO_BINANCE_SYMBOL[pair] || pair.replace('/', '').toLowerCase();
}

function fmtPrice(n: string): string {
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  if (num >= 1000) return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (num >= 1) return num.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return num.toFixed(6);
}

function fmtAmt(n: string): string {
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return num.toFixed(5);
}

export function OrderBook({ pair }: Props) {
  const wsBids = useOrderBookStore((s) => s.bids);
  const wsAsks = useOrderBookStore((s) => s.asks);
  const [depth, setDepth] = useState<DepthData>({ bids: [], asks: [] });
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const fetchDepth = async () => {
      try {
        const symbol = binanceSymbol(pair);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/market/depth?symbol=${symbol}&limit=20`
        );
        const json = await res.json();
        if (json.success && json.data) {
          setDepth({ bids: json.data.bids, asks: json.data.asks });
        }
      } catch {
        // Keep stale data on error
      }
    };

    fetchDepth();
    intervalRef.current = setInterval(fetchDepth, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pair]);

  // Use REST depth data, fall back to WebSocket data
  const bids = depth.bids.length > 0 ? depth.bids : wsBids;
  const asks = depth.asks.length > 0 ? depth.asks : wsAsks;

  const { maxTotal, cumulativeBids, cumulativeAsks } = useMemo(() => {
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

    return {
      maxTotal: Math.max(cBids[cBids.length - 1] || 0, cAsks[cAsks.length - 1] || 0, 1),
      cumulativeBids: cBids,
      cumulativeAsks: cAsks,
    };
  }, [bids, asks]);

  const displayAsks = asks.slice(0, 14).reverse();
  const displayBids = bids.slice(0, 14);

  const spread =
    asks.length > 0 && bids.length > 0
      ? parseFloat(asks[0][0]) - parseFloat(bids[0][0])
      : 0;
  const spreadPercent =
    asks.length > 0 && spread > 0 ? (spread / parseFloat(asks[0][0])) * 100 : 0;

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

      {/* Asks — reversed so lowest ask is at bottom */}
      <div className="flex-1 overflow-y-auto flex flex-col-reverse">
        {displayAsks.map((ask, i) => {
          const actualIndex = displayAsks.length - 1 - i;
          const cumIdx = actualIndex + (asks.length - displayAsks.length);
          const total = cumulativeAsks[cumIdx] ?? parseFloat(ask[1]);
          const depthPct = (total / maxTotal) * 100;
          return (
            <div key={`ask-${i}`} className="grid grid-cols-3 px-3 py-[1px] text-xs relative group">
              <div
                className="absolute inset-y-0 right-0 bg-[#F6465D]/10"
                style={{ width: `${Math.min(depthPct, 100)}%` }}
              />
              <span className="relative text-[#F6465D] font-mono text-[11px]">{fmtPrice(ask[0])}</span>
              <span className="relative text-right font-mono text-[11px] text-[#EAECEF]">{fmtAmt(ask[1])}</span>
              <span className="relative text-right font-mono text-[11px] text-[#848E9C]">{fmtAmt(total.toString())}</span>
            </div>
          );
        })}
      </div>

      {/* Spread */}
      <div className="px-3 py-1.5 text-[11px] text-center text-[#848E9C] border-y border-[#2B3139] shrink-0">
        {spread > 0 ? (
          <>
            <span className="font-mono text-white">{fmtPrice(spread.toString())}</span>
            <span className="text-[10px] ml-1">({spreadPercent.toFixed(4)}%)</span>
          </>
        ) : (
          <span>Loading...</span>
        )}
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-y-auto">
        {displayBids.map((bid, i) => {
          const total = cumulativeBids[i] ?? parseFloat(bid[1]);
          const depthPct = (total / maxTotal) * 100;
          return (
            <div key={`bid-${i}`} className="grid grid-cols-3 px-3 py-[1px] text-xs relative group">
              <div
                className="absolute inset-y-0 right-0 bg-[#0ECB81]/10"
                style={{ width: `${Math.min(depthPct, 100)}%` }}
              />
              <span className="relative text-[#0ECB81] font-mono text-[11px]">{fmtPrice(bid[0])}</span>
              <span className="relative text-right font-mono text-[11px] text-[#EAECEF]">{fmtAmt(bid[1])}</span>
              <span className="relative text-right font-mono text-[11px] text-[#848E9C]">{fmtAmt(total.toString())}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
