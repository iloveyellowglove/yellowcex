'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTradeFormStore, usePriceStore } from '../../store/trading';
import { useAuth } from '../../lib/auth';
import { apiPost, apiGet } from '../../lib/api';
import type { TradingPair, Balance, Order, Trade, Wallet } from '@/types/shared';

interface Props {
  pair: TradingPair;
}

export function OrderForm({ pair }: Props) {
  const { user } = useAuth();
  const { orderSide, orderType, limitPrice, amount, setOrderSide, setOrderType, setLimitPrice, setAmount } =
    useTradeFormStore();
  const price = usePriceStore((s) => s.getPrice(pair));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);

  useEffect(() => {
    if (user) {
      apiGet<{ wallets: Wallet[]; balances: Balance[] }>('/api/wallets').then((res) => {
        if (res.success && res.data) setBalances(res.data.balances);
      });
    }
  }, [user]);

  const [base, quote] = pair.split('/');
  const baseBalance = balances.find((b) => b.currency === base)?.available ?? '0';
  const quoteBalance = balances.find((b) => b.currency === quote)?.available ?? '0';

  const maxAmount = useMemo(() => {
    if (orderSide === 'buy' && orderType === 'limit' && limitPrice && parseFloat(limitPrice) > 0) {
      return (parseFloat(quoteBalance) / parseFloat(limitPrice)).toString();
    }
    if (orderSide === 'buy' && orderType === 'market' && price && parseFloat(price) > 0) {
      return (parseFloat(quoteBalance) / parseFloat(price)).toString();
    }
    return baseBalance;
  }, [orderSide, orderType, limitPrice, price, baseBalance, quoteBalance]);

  const total = useMemo(() => {
    if (orderType === 'limit' && limitPrice && amount) {
      return parseFloat(limitPrice) * parseFloat(amount);
    }
    if (orderType === 'market' && price && amount) {
      return parseFloat(price) * parseFloat(amount);
    }
    return 0;
  }, [orderType, limitPrice, amount, price]);

  const handlePercent = (pct: number) => {
    const max = parseFloat(maxAmount);
    if (max > 0) {
      setAmount((max * pct).toFixed(pair === 'DOGE/USDT' ? 2 : pair === 'BTC/ETH' ? 6 : 4));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const body: {
        pair: TradingPair;
        side: 'buy' | 'sell';
        type: 'limit' | 'market';
        amount: string;
        price?: string;
      } = { pair, side: orderSide, type: orderType, amount };
      if (orderType === 'limit') body.price = limitPrice;

      const res = await apiPost<{ order: Order; trades: Trade[] }>('/api/orders', body);
      if (res.success) {
        setMessage({
          type: 'success',
          text: res.data?.trades?.length
            ? `Order filled! ${res.data.trades.length} trade(s)`
            : 'Order placed successfully',
        });
        setAmount('');
        if (orderType === 'limit') setLimitPrice('');
      } else {
        setMessage({ type: 'error', text: res.error ?? 'Order failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Order failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center px-3 py-2 border-b border-[#2B3139]">
        <span className="text-xs font-medium text-[#848E9C]">Place Order</span>
      </div>

      {/* Buy/Sell toggle */}
      <div className="grid grid-cols-2 p-2 gap-1.5">
        <button
          onClick={() => setOrderSide('buy')}
          className={`py-1.5 text-sm font-medium rounded-md transition-all ${
            orderSide === 'buy'
              ? 'bg-[#0ECB81] text-white shadow-lg shadow-[#0ECB81]/20'
              : 'bg-[#1E2329] text-[#848E9C] hover:text-white'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setOrderSide('sell')}
          className={`py-1.5 text-sm font-medium rounded-md transition-all ${
            orderSide === 'sell'
              ? 'bg-[#F6465D] text-white shadow-lg shadow-[#F6465D]/20'
              : 'bg-[#1E2329] text-[#848E9C] hover:text-white'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Available balance */}
      <div className="px-3 pb-2">
        <div className="flex justify-between text-[10px] text-[#848E9C]">
          <span>Available</span>
          <span className="font-mono">
            {orderSide === 'buy'
              ? `${parseFloat(quoteBalance).toFixed(4)} ${quote}`
              : `${parseFloat(baseBalance).toFixed(4)} ${base}`}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-3 space-y-2">
        {/* Order type */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setOrderType('limit')}
            className={`flex-1 py-1 text-xs rounded transition-colors ${
              orderType === 'limit'
                ? 'bg-brand/10 text-brand border border-brand/30'
                : 'bg-[#1E2329] text-[#848E9C] border border-transparent'
            }`}
          >
            Limit
          </button>
          <button
            type="button"
            onClick={() => setOrderType('market')}
            className={`flex-1 py-1 text-xs rounded transition-colors ${
              orderType === 'market'
                ? 'bg-brand/10 text-brand border border-brand/30'
                : 'bg-[#1E2329] text-[#848E9C] border border-transparent'
            }`}
          >
            Market
          </button>
        </div>

        {orderType === 'limit' && (
          <div>
            <label className="text-[10px] text-[#848E9C] uppercase tracking-wider">Price ({quote})</label>
            <div className="relative mt-1">
              <input
                type="number"
                step="any"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="w-full px-2 py-1.5 bg-[#1E2329] border border-[#2B3139] rounded text-sm font-mono text-white focus:outline-none focus:border-brand placeholder-[#474D57]"
                placeholder={price || '0.00'}
              />
            </div>
          </div>
        )}

        {orderType === 'market' && price && (
          <div className="text-[10px] text-[#848E9C]">
            Est. price: <span className="text-white font-mono">{parseFloat(price).toFixed(4)} {quote}</span>
          </div>
        )}

        <div>
          <label className="text-[10px] text-[#848E9C] uppercase tracking-wider">Amount ({base})</label>
          <div className="relative mt-1">
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-2 py-1.5 bg-[#1E2329] border border-[#2B3139] rounded text-sm font-mono text-white focus:outline-none focus:border-brand placeholder-[#474D57]"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Percentage buttons */}
        <div className="grid grid-cols-4 gap-1">
          {[0.25, 0.5, 0.75, 1].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => handlePercent(pct)}
              className="py-1 text-[10px] font-medium bg-[#1E2329] text-[#848E9C] rounded hover:bg-[#2B3139] hover:text-white transition-colors"
            >
              {Math.round(pct * 100)}%
            </button>
          ))}
        </div>

        {total > 0 && (
          <div className="text-[10px] text-[#848E9C] flex justify-between">
            <span>Total</span>
            <span className="font-mono text-white">{total.toFixed(4)} {quote}</span>
          </div>
        )}

        {message && (
          <div
            className={`text-xs px-2 py-1 rounded ${
              message.type === 'success' ? 'bg-[#0ECB81]/10 text-[#0ECB81]' : 'bg-[#F6465D]/10 text-[#F6465D]'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-2 text-sm font-semibold rounded-md transition-all disabled:opacity-50 ${
            orderSide === 'buy'
              ? 'bg-[#0ECB81] text-white hover:bg-[#0ECB81]/90 shadow-lg shadow-[#0ECB81]/20'
              : 'bg-[#F6465D] text-white hover:bg-[#F6465D]/90 shadow-lg shadow-[#F6465D]/20'
          }`}
        >
          {submitting ? 'Placing...' : `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${base}`}
        </button>
      </form>
    </div>
  );
}
