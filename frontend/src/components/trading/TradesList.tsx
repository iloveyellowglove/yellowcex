'use client';

import React, { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import type { TradingPair, RecentTrade } from '@/types/shared';

interface Props {
  pair: TradingPair;
}

export function TradesList({ pair }: Props) {
  const [trades, setTrades] = useState<RecentTrade[]>([]);

  useEffect(() => {
    const fetch = () => {
      apiGet<RecentTrade[]>(`/api/trades?pair=${pair}&limit=30`).then((res) => {
        if (res.success && res.data) setTrades(res.data as RecentTrade[]);
      });
    };
    fetch();
    const interval = setInterval(fetch, 3000);
    return () => clearInterval(interval);
  }, [pair]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center px-3 py-2 border-b border-[hsl(220,13%,15%)]">
        <span className="text-xs font-medium text-[hsl(220,10%,60%)]">Recent Trades</span>
      </div>
      <div className="grid grid-cols-3 px-3 py-1 text-[10px] text-[hsl(220,10%,40%)] uppercase tracking-wider">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Time</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="text-center text-xs text-[hsl(220,10%,50%)] py-4">No trades yet</div>
        ) : (
          trades.map((trade, i) => (
            <div key={trade.id || i} className="grid grid-cols-3 px-3 py-0.5 text-xs">
              <span className={`font-mono ${trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                {parseFloat(trade.price).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
              <span className="text-right font-mono text-[hsl(220,10%,80%)]">
                {parseFloat(trade.amount).toFixed(4)}
              </span>
              <span className="text-right font-mono text-[hsl(220,10%,40%)]">
                {new Date(trade.time).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
