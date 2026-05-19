'use client';

import { create } from 'zustand';
import type { TradingPair } from '@yellowcex/shared';
import { TRADING_PAIRS } from '@yellowcex/shared';

interface PriceState {
  prices: Record<string, {
    price: string;
    change24h: string;
    changePercent24h: string;
    high24h: string;
    low24h: string;
    volume24h: string;
  }>;
  setPrice: (pair: TradingPair, data: {
    price: string;
    change24h: string;
    changePercent24h: string;
    high24h: string;
    low24h: string;
    volume24h: string;
  }) => void;
  getPrice: (pair: TradingPair) => string;
}

export const usePriceStore = create<PriceState>((set, get) => ({
  prices: {},
  setPrice: (pair, data) =>
    set((state) => ({
      prices: { ...state.prices, [pair]: data },
    })),
  getPrice: (pair) => get().prices[pair]?.price ?? '0',
}));

interface OrderBookState {
  bids: [string, string][];
  asks: [string, string][];
  setOrderBook: (bids: [string, string][], asks: [string, string][]) => void;
}

export const useOrderBookStore = create<OrderBookState>((set) => ({
  bids: [],
  asks: [],
  setOrderBook: (bids, asks) => set({ bids, asks }),
}));

interface TradeState {
  pair: TradingPair;
  orderSide: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  limitPrice: string;
  amount: string;
  setPair: (pair: TradingPair) => void;
  setOrderSide: (side: 'buy' | 'sell') => void;
  setOrderType: (type: 'limit' | 'market') => void;
  setLimitPrice: (price: string) => void;
  setAmount: (amount: string) => void;
}

export const useTradeFormStore = create<TradeState>((set) => ({
  pair: 'BTC/USDT' as TradingPair,
  orderSide: 'buy',
  orderType: 'limit',
  limitPrice: '',
  amount: '',
  setPair: (pair) => set({ pair }),
  setOrderSide: (side) => set({ orderSide: side }),
  setOrderType: (type) => set({ orderType: type }),
  setLimitPrice: (limitPrice) => set({ limitPrice }),
  setAmount: (amount) => set({ amount }),
}));
