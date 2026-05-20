// ─── Types copied from @yellowcex/shared ────────────────────
// Bundled locally so webpack doesn't need to transpile the shared package.

// ── user.ts ──
export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  kyc_status: KycStatus;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  kyc_status: KycStatus;
  created_at: string;
}

// ── wallet.ts ──
export type Currency =
  | 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'SOL'
  | 'BNB' | 'XRP' | 'ADA' | 'DOGE' | 'MATIC';

export type CurrencyNetwork = 'bitcoin' | 'ethereum' | 'bsc' | 'solana';

export interface Wallet {
  id: string;
  user_id: string;
  currency: Currency;
  address: string;
  balance: string;
  created_at: string;
  updated_at: string;
}

export interface Balance {
  currency: Currency;
  available: string;
  locked: string;
}

export interface WalletWithBalance extends Wallet {
  available: string;
  locked: string;
}

export interface DepositAddress {
  currency: Currency;
  address: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  'BTC', 'ETH', 'USDT', 'USDC', 'SOL',
  'BNB', 'XRP', 'ADA', 'DOGE', 'MATIC',
];

export const CURRENCY_NETWORKS: Record<Currency, CurrencyNetwork> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'ethereum',
  USDC: 'ethereum',
  BNB: 'bsc',
  SOL: 'solana',
  XRP: 'ethereum',
  ADA: 'ethereum',
  DOGE: 'bitcoin',
  MATIC: 'ethereum',
};

export const CURRENCY_DECIMALS: Record<Currency, number> = {
  BTC: 8,
  ETH: 18,
  USDT: 6,
  USDC: 6,
  BNB: 18,
  SOL: 9,
  XRP: 6,
  ADA: 6,
  DOGE: 8,
  MATIC: 18,
};

export const ERC20_TOKENS: Record<string, { symbol: Currency; decimals: number }> = {
  USDT: { symbol: 'USDT', decimals: 6 },
  USDC: { symbol: 'USDC', decimals: 6 },
};

export const TESTNET_ERC20_ADDRESSES: Record<string, string> = {
  USDT: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA36',
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
};

// ── order.ts ──
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';
export type OrderStatus = 'open' | 'partial' | 'filled' | 'cancelled';

export interface Order {
  id: string;
  user_id: string;
  pair: string;
  side: OrderSide;
  type: OrderType;
  price: string;
  amount: string;
  filled: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderRequest {
  pair: string;
  side: OrderSide;
  type: OrderType;
  price?: string;
  amount: string;
}

export interface OrderBookLevel {
  price: string;
  amount: string;
  total: string;
  count: number;
}

export interface OrderBook {
  pair: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdated: string;
}

// ── trade.ts ──
export interface Trade {
  id: string;
  pair: string;
  price: string;
  amount: string;
  side: 'buy' | 'sell';
  buy_order_id: string;
  sell_order_id: string;
  created_at: string;
}

export interface RecentTrade {
  id: string;
  pair: string;
  price: string;
  amount: string;
  side: 'buy' | 'sell';
  time: string;
}

// ── kyc.ts ──
export type DocumentType = 'passport' | 'drivers_license' | 'national_id';
export type KycDocumentStatus = 'pending' | 'approved' | 'rejected';

export interface KycDocument {
  id: string;
  user_id: string;
  document_type: DocumentType;
  image_url: string;
  status: KycDocumentStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

export interface KycSubmission {
  document_type: DocumentType;
  image_file: File;
}

// ── api.ts ──
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ── websocket.ts ──
export type WsEventType =
  | 'price_update'
  | 'orderbook_update'
  | 'trade_update'
  | 'order_update'
  | 'balance_update'
  | 'error';

export interface WsMessage<T = unknown> {
  type: WsEventType;
  payload: T;
  timestamp: number;
}

export interface PriceUpdate {
  pair: string;
  price: string;
  change24h: string;
  changePercent24h: string;
  high24h: string;
  low24h: string;
  volume24h: string;
}

export interface OrderbookUpdate {
  pair: string;
  bids: [string, string][];
  asks: [string, string][];
}

// ── market.ts ──
export type TradingPair =
  | 'BTC/USDT' | 'ETH/USDT' | 'BNB/USDT' | 'SOL/USDT'
  | 'XRP/USDT' | 'ADA/USDT' | 'DOGE/USDT';

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
  'XRP/USDT', 'ADA/USDT', 'DOGE/USDT',
];

export const PAIR_TO_BINANCE_SYMBOL: Record<TradingPair, string> = {
  'BTC/USDT': 'btcusdt',
  'ETH/USDT': 'ethusdt',
  'BNB/USDT': 'bnbusdt',
  'SOL/USDT': 'solusdt',
  'XRP/USDT': 'xrpusdt',
  'ADA/USDT': 'adausdt',
  'DOGE/USDT': 'dogeusdt',
};

export const TRADING_PAIR_INFO: Record<TradingPair, { base: string; quote: string; basePrecision: number; quotePrecision: number }> = {
  'BTC/USDT': { base: 'BTC', quote: 'USDT', basePrecision: 8, quotePrecision: 2 },
  'ETH/USDT': { base: 'ETH', quote: 'USDT', basePrecision: 8, quotePrecision: 2 },
  'BNB/USDT': { base: 'BNB', quote: 'USDT', basePrecision: 6, quotePrecision: 2 },
  'SOL/USDT': { base: 'SOL', quote: 'USDT', basePrecision: 6, quotePrecision: 2 },
  'XRP/USDT': { base: 'XRP', quote: 'USDT', basePrecision: 4, quotePrecision: 4 },
  'ADA/USDT': { base: 'ADA', quote: 'USDT', basePrecision: 4, quotePrecision: 4 },
  'DOGE/USDT': { base: 'DOGE', quote: 'USDT', basePrecision: 2, quotePrecision: 6 },
};
