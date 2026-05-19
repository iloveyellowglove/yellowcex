'use client';

import React from 'react';
import { useTradeFormStore } from '../../store/trading';
import type { TradingPair } from '@yellowcex/shared';
import { TRADING_PAIRS } from '@yellowcex/shared';

const PAIR_GROUPS = [
  { label: 'USDT Markets', pairs: TRADING_PAIRS.filter((p) => p.endsWith('/USDT')) },
  { label: 'BTC Markets', pairs: TRADING_PAIRS.filter((p) => p.endsWith('/BTC') || p.endsWith('/ETH')) },
];

export function MarketSelector() {
  const pair = useTradeFormStore((s) => s.pair);
  const setPair = useTradeFormStore((s) => s.setPair);

  return (
    <div className="h-10 bg-[hsl(220,13%,9%)] border-b border-[hsl(220,13%,15%)] flex items-center px-3 gap-1 overflow-x-auto shrink-0">
      {TRADING_PAIRS.map((p) => (
        <button
          key={p}
          onClick={() => setPair(p)}
          className={`px-3 py-1 text-xs font-mono rounded-md whitespace-nowrap transition-colors ${
            p === pair
              ? 'bg-brand/20 text-brand border border-brand/30'
              : 'text-[hsl(220,10%,60%)] hover:text-white border border-transparent hover:border-[hsl(220,13%,22%)]'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
