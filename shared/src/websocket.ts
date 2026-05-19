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
