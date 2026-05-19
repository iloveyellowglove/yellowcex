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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
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

    // Require KYC approval for withdrawals
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('kyc_status')
      .eq('id', userId)
      .single();

    if (!user || user.kyc_status !== 'approved') {
      res.status(403).json({ success: false, error: 'KYC approval required for withdrawals' });
      return;
    }

    // Use walletService to deduct balance (with proper integer arithmetic)
    const cur = currency as Currency;
    await walletService.lockBalance(userId, cur, amount);

    // Create withdrawal transaction (tx_hash is the withdrawal address for pending withdrawals)
    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      type: 'withdrawal',
      currency,
      amount,
      withdrawal_address: toAddress,
      status: 'pending',
    });

    res.json({ success: true, message: 'Withdrawal initiated' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
