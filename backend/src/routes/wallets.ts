import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../db/supabase';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { walletService } from '../services/walletService';
import { SUPPORTED_CURRENCIES } from '@yellowcex/shared';
import type { Currency } from '@yellowcex/shared';

const router = Router();

// GET /api/wallets
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const balances = await walletService.getBalances(req.user!.userId);

    const { data: wallets } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', req.user!.userId);

    res.json({
      success: true,
      data: {
        wallets: wallets ?? [],
        balances,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wallets/:currency/address
router.get('/:currency/address', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currency = req.params.currency.toUpperCase() as Currency;

    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      res.status(400).json({ success: false, error: 'Unsupported currency' });
      return;
    }

    const address = await walletService.getOrCreateWallet(req.user!.userId, currency);
    res.json({ success: true, data: { currency, address } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wallets/:currency/balance
router.get('/:currency/balance', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currency = req.params.currency.toUpperCase() as Currency;

    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      res.status(400).json({ success: false, error: 'Unsupported currency' });
      return;
    }

    const balance = await walletService.getBalance(req.user!.userId, currency);
    res.json({ success: true, data: { currency, ...balance } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const withdrawSchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES as [string, ...string[]]),
  amount: z.string(),
  toAddress: z.string().min(10),
});

// POST /api/wallets/withdraw
router.post('/withdraw', authMiddleware, validate(withdrawSchema), async (req: Request, res: Response) => {
  try {
    const { currency, amount, toAddress } = req.body;
    const userId = req.user!.userId;

    // Check balance
    const balance = await walletService.getBalance(userId, currency);
    if (BigInt(balance.available) < BigInt(amount)) {
      res.status(400).json({ success: false, error: 'Insufficient balance' });
      return;
    }

    // Deduct balance
    const { error } = await supabaseAdmin
      .from('balances')
      .select('available')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    // Create withdrawal transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      type: 'withdrawal',
      currency,
      amount,
      tx_hash: toAddress, // Store withdrawal address
      status: 'pending',
    });

    // Deduct from balance
    const currentAvailable = BigInt(balance.available);
    await supabaseAdmin
      .from('balances')
      .update({ available: (currentAvailable - BigInt(amount)).toString() })
      .eq('user_id', userId)
      .eq('currency', currency);

    res.json({ success: true, message: 'Withdrawal initiated' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wallets/transactions
router.get('/transactions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { data, count } = await supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user!.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    res.json({
      success: true,
      data,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
