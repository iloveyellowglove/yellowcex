import { PAIR_TO_BINANCE_SYMBOL, type OrderBook, type OrderBookLevel, type Order, type Trade, type TradingPair } from '@yellowcex/shared';
import { supabaseAdmin } from '../db/supabase';
import { walletService } from './walletService';
import type { Currency } from '@yellowcex/shared';
import { TRADING_PAIR_INFO, TRADING_PAIRS } from '@yellowcex/shared';

interface OrderEntry {
  id: string;
  userId: string;
  pair: TradingPair;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  price: string;
  amount: string;
  filled: string;
  status: 'open' | 'partial' | 'filled' | 'cancelled';
  createdAt: number;
}

class OrderBookEngine {
  private bids: Map<TradingPair, OrderEntry[]> = new Map();
  private asks: Map<TradingPair, OrderEntry[]> = new Map();
  private lastPrices: Map<TradingPair, string> = new Map();

  constructor() {
    for (const pair of TRADING_PAIRS) {
      this.bids.set(pair, []);
      this.asks.set(pair, []);
    }
  }

  getOrderBook(pair: TradingPair): OrderBook {
    const bids = this.aggregateLevels(this.bids.get(pair) ?? [], 'desc');
    const asks = this.aggregateLevels(this.asks.get(pair) ?? [], 'asc');

    return {
      pair,
      bids,
      asks,
      lastUpdated: new Date().toISOString(),
    };
  }

  getLastPrice(pair: TradingPair): string {
    return this.lastPrices.get(pair) ?? '0';
  }

  async addOrder(order: OrderEntry): Promise<Trade[]> {
    const trades: Trade[] = [];
    const oppositeSide = order.side === 'buy' ? this.asks : this.bids;
    const sameSide = order.side === 'buy' ? this.bids : this.asks;
    const pair = order.pair;

    if (order.type === 'market') {
      trades.push(...(await this.matchMarket(order, oppositeSide)));
    } else {
      trades.push(...(await this.matchLimit(order, oppositeSide)));
    }

    if (order.status !== 'filled') {
      const sideOrders = sameSide.get(pair) ?? [];
      sideOrders.push(order);
      // Sort: buys by price descending, sells by price ascending
      sideOrders.sort((a, b) =>
        order.side === 'buy'
          ? parseFloat(b.price) - parseFloat(a.price)
          : parseFloat(a.price) - parseFloat(b.price)
      );
      sameSide.set(pair, sideOrders);
    }

    return trades;
  }

  private async matchMarket(order: OrderEntry, oppositeSide: Map<TradingPair, OrderEntry[]>): Promise<Trade[]> {
    const trades: Trade[] = [];
    const oppOrders = oppositeSide.get(order.pair) ?? [];
    let remaining = parseFloat(order.amount);

    const eligibleOrders = oppOrders.filter((o) => o.status !== 'filled' && o.status !== 'cancelled');
    const sorted =
      order.side === 'buy'
        ? eligibleOrders.sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
        : eligibleOrders.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

    for (const opposite of sorted) {
      if (remaining <= 0) break;

      const oppRemaining = parseFloat(opposite.amount) - parseFloat(opposite.filled);
      const matchAmount = Math.min(remaining, oppRemaining);

      trades.push({
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pair: order.pair,
        price: opposite.price,
        amount: matchAmount.toString(),
        side: order.side,
        buy_order_id: order.side === 'buy' ? order.id : opposite.id,
        sell_order_id: order.side === 'sell' ? order.id : opposite.id,
        created_at: new Date().toISOString(),
      });

      const newOppFilled = parseFloat(opposite.filled) + matchAmount;
      opposite.filled = newOppFilled.toString();
      opposite.status = newOppFilled >= parseFloat(opposite.amount) ? 'filled' : 'partial';

      remaining -= matchAmount;
      this.lastPrices.set(order.pair, opposite.price);
    }

    const filledAmount = parseFloat(order.amount) - remaining;
    order.filled = filledAmount.toString();
    order.status = remaining <= 0 ? 'filled' : remaining < parseFloat(order.amount) ? 'partial' : 'open';

    // Settle trades
    for (const trade of trades) {
      await this.settleTrade(trade);
    }

    return trades;
  }

  private async matchLimit(order: OrderEntry, oppositeSide: Map<TradingPair, OrderEntry[]>): Promise<Trade[]> {
    const trades: Trade[] = [];
    const oppOrders = oppositeSide.get(order.pair) ?? [];
    let remaining = parseFloat(order.amount);

    const eligibleOrders = oppOrders.filter(
      (o) => o.status !== 'filled' && o.status !== 'cancelled'
    );

    const matchingOrders =
      order.side === 'buy'
        ? eligibleOrders
            .filter((o) => parseFloat(o.price) <= parseFloat(order.price))
            .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
        : eligibleOrders
            .filter((o) => parseFloat(o.price) >= parseFloat(order.price))
            .sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

    for (const opposite of matchingOrders) {
      if (remaining <= 0) break;

      const oppRemaining = parseFloat(opposite.amount) - parseFloat(opposite.filled);
      const matchAmount = Math.min(remaining, oppRemaining);
      const matchPrice = opposite.price;

      trades.push({
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pair: order.pair,
        price: matchPrice,
        amount: matchAmount.toString(),
        side: order.side,
        buy_order_id: order.side === 'buy' ? order.id : opposite.id,
        sell_order_id: order.side === 'sell' ? order.id : opposite.id,
        created_at: new Date().toISOString(),
      });

      const newOppFilled = parseFloat(opposite.filled) + matchAmount;
      opposite.filled = newOppFilled.toString();
      opposite.status = newOppFilled >= parseFloat(opposite.amount) ? 'filled' : 'partial';

      remaining -= matchAmount;
      this.lastPrices.set(order.pair, matchPrice);
    }

    const filledAmount = parseFloat(order.amount) - remaining;
    order.filled = filledAmount.toString();
    order.status = remaining <= 0 ? 'filled' : remaining < parseFloat(order.amount) ? 'partial' : 'open';

    for (const trade of trades) {
      await this.settleTrade(trade);
    }

    return trades;
  }

  private async settleTrade(trade: Trade): Promise<void> {
    try {
      const pairInfo = TRADING_PAIR_INFO[trade.pair as TradingPair];
      if (!pairInfo) return;

      const buyOrder = this.findOrderById(trade.buy_order_id);
      const sellOrder = this.findOrderById(trade.sell_order_id);

      if (!buyOrder || !sellOrder) return;

      // Persist trade to DB
      await supabaseAdmin.from('trades').insert({
        id: trade.id,
        pair: trade.pair,
        price: trade.price,
        amount: trade.amount,
        side: trade.side,
        buy_order_id: trade.buy_order_id,
        sell_order_id: trade.sell_order_id,
        buyer_id: buyOrder.userId,
        seller_id: sellOrder.userId,
      });

      // Update order fill status in DB
      await supabaseAdmin.from('orders').update({
        filled: buyOrder.filled,
        status: buyOrder.status,
        updated_at: new Date().toISOString(),
      }).eq('id', buyOrder.id);

      await supabaseAdmin.from('orders').update({
        filled: sellOrder.filled,
        status: sellOrder.status,
        updated_at: new Date().toISOString(),
      }).eq('id', sellOrder.id);
    } catch (err) {
      console.error('Trade settlement error:', err);
    }
  }

  private findOrderById(id: string): OrderEntry | undefined {
    for (const [, orders] of this.bids) {
      const found = orders.find((o) => o.id === id);
      if (found) return found;
    }
    for (const [, orders] of this.asks) {
      const found = orders.find((o) => o.id === id);
      if (found) return found;
    }
    return undefined;
  }

  async cancelOrder(orderId: string, userId: string): Promise<boolean> {
    for (const [, orders] of this.bids) {
      const order = orders.find((o) => o.id === orderId && o.userId === userId);
      if (order && (order.status === 'open' || order.status === 'partial')) {
        order.status = 'cancelled';
        await supabaseAdmin.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', orderId);
        return true;
      }
    }
    for (const [, orders] of this.asks) {
      const order = orders.find((o) => o.id === orderId && o.userId === userId);
      if (order && (order.status === 'open' || order.status === 'partial')) {
        order.status = 'cancelled';
        await supabaseAdmin.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', orderId);
        return true;
      }
    }
    return false;
  }

  async loadOpenOrders(): Promise<void> {
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('*')
      .in('status', ['open', 'partial']);

    if (!orders) return;

    for (const order of orders) {
      const entry: OrderEntry = {
        id: order.id,
        userId: order.user_id,
        pair: order.pair as TradingPair,
        side: order.side,
        type: order.type,
        price: order.price,
        amount: order.amount,
        filled: order.filled,
        status: order.status,
        createdAt: new Date(order.created_at).getTime(),
      };

      const side = order.side === 'buy' ? this.bids : this.asks;
      const existing = side.get(order.pair) ?? [];
      existing.push(entry);
      side.set(order.pair, existing);
    }
  }

  private aggregateLevels(orders: OrderEntry[], sort: 'asc' | 'desc'): OrderBookLevel[] {
    const levels = new Map<string, { amount: string; count: number }>();

    for (const order of orders) {
      if (order.status === 'filled' || order.status === 'cancelled') continue;
      const remaining = parseFloat(order.amount) - parseFloat(order.filled);
      if (remaining <= 0) continue;

      const existing = levels.get(order.price) ?? { amount: '0', count: 0 };
      existing.amount = (parseFloat(existing.amount) + remaining).toString();
      existing.count += 1;
      levels.set(order.price, existing);
    }

    const result: OrderBookLevel[] = [];
    let cumulative = 0;

    const sorted =
      sort === 'desc'
        ? [...levels.entries()].sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
        : [...levels.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));

    for (const [price, level] of sorted) {
      cumulative += parseFloat(level.amount);
      result.push({
        price,
        amount: level.amount,
        total: cumulative.toString(),
        count: level.count,
      });
    }

    return result;
  }
}

export const orderbookEngine = new OrderBookEngine();
