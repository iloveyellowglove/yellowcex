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
