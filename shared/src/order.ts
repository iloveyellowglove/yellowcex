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
