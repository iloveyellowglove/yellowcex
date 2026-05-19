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

  useWebSocket();

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
        {/* Market selector bar with price data */}
        <MarketSelector />

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
