export type TradingPair =
  | 'BTC/USDT' | 'ETH/USDT' | 'BNB/USDT' | 'SOL/USDT'
  | 'XRP/USDT' | 'ADA/USDT' | 'DOGE/USDT' | 'SOL/BTC'
  | 'BNB/BTC';

export interface Market {
  pair: TradingPair;
  base: string;
  quote: string;
  lastPrice: string;
  priceChange24h: string;
  priceChangePercent24h: string;
  high24h: string;
  low24h: string;
  volume24h: string;
}

export interface Ticker {
  pair: TradingPair;
  price: string;
  timestamp: number;
}

export const TRADING_PAIRS: TradingPair[] = [
  'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT',
  'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'SOL/BTC',
  'BNB/BTC',
];

export const PAIR_TO_BINANCE_SYMBOL: Record<TradingPair, string> = {
  'BTC/USDT': 'btcusdt',
  'ETH/USDT': 'ethusdt',
  'BNB/USDT': 'bnbusdt',
  'SOL/USDT': 'solusdt',
  'XRP/USDT': 'xrpusdt',
  'ADA/USDT': 'adausdt',
  'DOGE/USDT': 'dogeusdt',
  'SOL/BTC': 'solbtc',
  'BNB/BTC': 'bnbbtc',
};

export const TRADING_PAIR_INFO: Record<TradingPair, { base: string; quote: string; basePrecision: number; quotePrecision: number }> = {
  'BTC/USDT': { base: 'BTC', quote: 'USDT', basePrecision: 8, quotePrecision: 2 },
  'ETH/USDT': { base: 'ETH', quote: 'USDT', basePrecision: 8, quotePrecision: 2 },
  'BNB/USDT': { base: 'BNB', quote: 'USDT', basePrecision: 6, quotePrecision: 2 },
  'SOL/USDT': { base: 'SOL', quote: 'USDT', basePrecision: 6, quotePrecision: 2 },
  'XRP/USDT': { base: 'XRP', quote: 'USDT', basePrecision: 4, quotePrecision: 4 },
  'ADA/USDT': { base: 'ADA', quote: 'USDT', basePrecision: 4, quotePrecision: 4 },
  'DOGE/USDT': { base: 'DOGE', quote: 'USDT', basePrecision: 2, quotePrecision: 6 },
  'SOL/BTC': { base: 'SOL', quote: 'BTC', basePrecision: 6, quotePrecision: 8 },
  'BNB/BTC': { base: 'BNB', quote: 'BTC', basePrecision: 6, quotePrecision: 8 },
};
