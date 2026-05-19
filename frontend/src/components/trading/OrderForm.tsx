'use client';

import React, { useState, useEffect } from 'react';
import { useTradeFormStore, usePriceStore } from '../../store/trading';
import { useAuth } from '../../lib/auth';
import { apiPost, apiGet } from '../../lib/api';
import type { TradingPair, Balance, Order, Trade, Wallet } from '@yellowcex/shared';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const body: { pair: TradingPair; side: 'buy' | 'sell'; type: 'limit' | 'market'; amount: string; price?: string } = { pair, side: orderSide, type: orderType, amount };
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
      <div className="flex items-center px-3 py-2 border-b border-[hsl(220,13%,15%)]">
        <span className="text-xs font-medium text-[hsl(220,10%,60%)]">Place Order</span>
      </div>

      {/* Buy/Sell toggle */}
      <div className="grid grid-cols-2 p-2 gap-1">
        <button
          onClick={() => setOrderSide('buy')}
          className={`py-1.5 text-sm font-medium rounded-lg transition-colors ${
            orderSide === 'buy' ? 'bg-green-600 text-white' : 'bg-[hsl(220,13%,15%)] text-[hsl(220,10%,50%)]'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setOrderSide('sell')}
          className={`py-1.5 text-sm font-medium rounded-lg transition-colors ${
            orderSide === 'sell' ? 'bg-red-600 text-white' : 'bg-[hsl(220,13%,15%)] text-[hsl(220,10%,50%)]'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Available balance */}
      <div className="px-3 pb-2">
        <div className="flex justify-between text-[10px] text-[hsl(220,10%,50%)]">
          <span>Available</span>
          <span className="font-mono">
            {orderSide === 'buy' ? `${parseFloat(quoteBalance).toFixed(4)} ${quote}` : `${parseFloat(baseBalance).toFixed(4)} ${base}`}
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
              orderType === 'limit' ? 'bg-brand/20 text-brand border border-brand/30' : 'bg-[hsl(220,13%,15%)] text-[hsl(220,10%,50%)]'
            }`}
          >
            Limit
          </button>
          <button
            type="button"
            onClick={() => setOrderType('market')}
            className={`flex-1 py-1 text-xs rounded transition-colors ${
              orderType === 'market' ? 'bg-brand/20 text-brand border border-brand/30' : 'bg-[hsl(220,13%,15%)] text-[hsl(220,10%,50%)]'
            }`}
          >
            Market
          </button>
        </div>

        {orderType === 'limit' && (
          <div>
            <label className="text-[10px] text-[hsl(220,10%,40%)] uppercase">Price ({quote})</label>
            <input
              type="number"
              step="any"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="w-full px-2 py-1.5 bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,18%)] rounded text-sm font-mono text-white focus:outline-none focus:border-brand"
              placeholder={price || '0.00'}
            />
          </div>
        )}

        <div>
          <label className="text-[10px] text-[hsl(220,10%,40%)] uppercase">Amount ({base})</label>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-2 py-1.5 bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,18%)] rounded text-sm font-mono text-white focus:outline-none focus:border-brand"
            placeholder="0.00"
          />
        </div>

        {orderType === 'limit' && limitPrice && amount && (
          <div className="text-[10px] text-[hsl(220,10%,50%)]">
            Total: {(parseFloat(limitPrice) * parseFloat(amount || '0')).toFixed(4)} {quote}
          </div>
        )}

        {message && (
          <div className={`text-xs px-2 py-1 rounded ${message.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-2 text-sm font-semibold rounded-lg transition-opacity disabled:opacity-50 ${
            orderSide === 'buy'
              ? 'bg-green-600 text-white hover:opacity-90'
              : 'bg-red-600 text-white hover:opacity-90'
          }`}
        >
          {submitting ? 'Placing...' : `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${base}`}
        </button>
      </form>
    </div>
  );
}
