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

export const ERC20_TOKENS: Record<string, { symbol: Currency; decimals: number }> = {
  USDT: { symbol: 'USDT', decimals: 6 },
  USDC: { symbol: 'USDC', decimals: 6 },
};

export const TESTNET_ERC20_ADDRESSES: Record<string, string> = {
  USDT: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA36', // Sepolia testnet USDT
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia testnet USDC
};
