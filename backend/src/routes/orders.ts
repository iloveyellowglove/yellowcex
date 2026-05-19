import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../db/supabase';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { orderbookEngine } from '../services/orderbook';
import { walletService } from '../services/walletService';
import { wsManager } from '../ws';
import { TRADING_PAIRS, TRADING_PAIR_INFO } from '@yellowcex/shared';
import type { TradingPair, Currency } from '@yellowcex/shared';

const router = Router();

const createOrderSchema = z.object({
  pair: z.enum(TRADING_PAIRS as [string, ...string[]]),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['limit', 'market']),
  price: z.string().optional(),
  amount: z.string(),
});

// POST /api/orders
router.post('/', authMiddleware, validate(createOrderSchema), async (req: Request, res: Response) => {
  try {
    const { pair, side, type, price, amount } = req.body;
    const userId = req.user!.userId;

    const orderPrice = type === 'market' ? '0' : (price ?? '0');
    const pairInfo = TRADING_PAIR_INFO[pair as TradingPair];

    // Lock balance before placing order
    if (side === 'buy' && type === 'limit') {
      const totalQuote = (parseFloat(amount) * parseFloat(orderPrice)).toString();
      await walletService.lockBalance(userId, pairInfo.quote, totalQuote);
    } else if (side === 'sell') {
      await walletService.lockBalance(userId, pairInfo.base, amount);
    }
    // For market buys, balance is checked at settlement time

    // Insert into DB
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        pair,
        side,
        type,
        price: orderPrice,
        amount,
        filled: '0',
        status: 'open',
      })
      .select('*')
      .single();

    if (error || !order) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to create order' });
      return;
    }

    // Submit to order book engine
    const trades = await orderbookEngine.addOrder({
      id: order.id,
      userId,
      pair: pair as TradingPair,
      side,
      type,
      price: orderPrice,
      amount,
      filled: '0',
      status: 'open',
      createdAt: Date.now(),
    });

    // Get updated order
    const { data: updatedOrder } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', order.id)
      .single();

    // Notify via WebSocket
    wsManager.sendToUser(userId, 'order_update', updatedOrder);

    if (trades.length > 0) {
      wsManager.broadcast(pair, 'trade_update', trades);
    }

    res.json({ success: true, data: { order: updatedOrder ?? order, trades } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/orders
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string | undefined;
    const pair = req.query.pair as string | undefined;

    let query = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user!.userId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (pair) query = query.eq('pair', pair);

    const { data, count, error } = await query.range(
      (page - 1) * limit,
      page * limit - 1
    );

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.json({
      success: true,
      data,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/orders/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user!.userId)
      .single();

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const cancelled = await orderbookEngine.cancelOrder(req.params.id, req.user!.userId);

    if (!cancelled) {
      res.status(400).json({ success: false, error: 'Order not found or already filled' });
      return;
    }

    wsManager.sendToUser(req.user!.userId, 'order_update', {
      id: req.params.id,
      status: 'cancelled',
    });

    res.json({ success: true, message: 'Order cancelled' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/orders/book/:pair
router.get('/book/:pair', async (req: Request, res: Response) => {
  try {
    const pair = req.params.pair as TradingPair;
    if (!TRADING_PAIRS.includes(pair)) {
      res.status(400).json({ success: false, error: 'Invalid trading pair' });
      return;
    }

    const orderBook = orderbookEngine.getOrderBook(pair);
    res.json({ success: true, data: orderBook });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
