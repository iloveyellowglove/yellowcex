'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Header } from '../../components/layout/Header';
import { TradingChart } from '../../components/trading/TradingChart';
import { OrderBook } from '../../components/trading/OrderBook';
import { OrderForm } from '../../components/trading/OrderForm';
import { TradesList } from '../../components/trading/TradesList';
import { MarketSelector } from '../../components/trading/MarketSelector';
import { AccountOverview } from '../../components/trading/AccountOverview';
import { useTradeFormStore } from '../../store/trading';

export default function TradePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pair = useTradeFormStore((s) => s.pair);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const { status } = useWebSocket(pair);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0B0E11] flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Market selector bar + status indicator */}
        <div className="flex items-center">
          <div className="flex-1 overflow-hidden">
            <MarketSelector />
          </div>
          <div className="flex items-center gap-1.5 px-3 border-l border-[#2B3139] h-10 shrink-0">
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                status === 'connected'
                  ? 'bg-[#0ECB81] shadow-[0_0_6px_#0ECB81]'
                  : status === 'connecting'
                  ? 'bg-[#F0B90B] animate-pulse'
                  : 'bg-[#F6465D]'
              }`}
            />
            <span className="text-[10px] text-[#848E9C] uppercase tracking-wider">
              {status === 'connected' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Main trading grid */}
        <div className="flex-1 grid grid-cols-12 gap-px bg-[#2B3139] overflow-hidden">
          {/* Order Book (left) */}
          <div className="col-span-3 bg-[#0B0E11] flex flex-col overflow-hidden">
            <OrderBook pair={pair} />
          </div>

          {/* Chart + Balances (center) */}
          <div className="col-span-6 bg-[#0B0E11] flex flex-col overflow-hidden">
            <div className="flex-1">
              <TradingChart pair={pair} />
            </div>
            <div className="h-[200px] border-t border-[#2B3139]">
              <AccountOverview />
            </div>
          </div>

          {/* Order Form + Trade History (right) */}
          <div className="col-span-3 bg-[#0B0E11] flex flex-col overflow-hidden">
            <OrderForm pair={pair} />
            <div className="flex-1 border-t border-[#2B3139] overflow-hidden">
              <TradesList pair={pair} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
