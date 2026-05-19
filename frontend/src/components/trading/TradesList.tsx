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
      apiGet<RecentTrade[]>(`/api/trades?pair=${pair}&limit=40`).then((res) => {
        if (res.success && res.data) setTrades(res.data as RecentTrade[]);
      });
    };
    fetch();
    const interval = setInterval(fetch, 3000);
    return () => clearInterval(interval);
  }, [pair]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center px-3 py-2 border-b border-[#2B3139] shrink-0">
        <span className="text-xs font-medium text-[#848E9C]">Recent Trades</span>
      </div>
      <div className="grid grid-cols-3 px-3 py-1 text-[10px] text-[#474D57] uppercase tracking-wider shrink-0">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Time</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="text-center text-xs text-[#474D57] py-8">No trades yet</div>
        ) : (
          trades.map((trade, i) => (
            <div key={trade.id || i} className="grid grid-cols-3 px-3 py-[1px] text-xs hover:bg-[#1E2329] transition-colors">
              <span className={`font-mono text-[11px] ${trade.side === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {parseFloat(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
              </span>
              <span className="text-right font-mono text-[11px] text-[#EAECEF]">
                {parseFloat(trade.amount).toFixed(4)}
              </span>
              <span className="text-right font-mono text-[11px] text-[#474D57]">
                {new Date(trade.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
