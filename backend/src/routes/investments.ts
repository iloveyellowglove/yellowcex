import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as investmentService from '../services/investmentService';
import { supabaseAdmin } from '../db/supabase';

const router = Router();

const depositSchema = z.object({
  plan_id: z.string().uuid(),
  amount: z.number().positive(),
});

// GET /api/investments/plans — no auth required
router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const plans = await investmentService.getActivePlans();
    res.json({ success: true, data: plans });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/investments/deposit — auth required
router.post('/deposit', authMiddleware, validate(depositSchema), async (req: Request, res: Response) => {
  try {
    const { plan_id, amount } = req.body;
    const investment = await investmentService.createInvestment(req.user!.userId, plan_id, amount);
    res.json({ success: true, data: investment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ success: false, error: message });
  }
});

// GET /api/investments/earnings — auth required
router.get('/earnings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const investments = await investmentService.getUserInvestments(req.user!.userId);
    res.json({ success: true, data: investments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/investments/referral-stats — auth required
router.get('/referral-stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get the user's referral_code
    const { data: userRow, error: userError } = await supabaseAdmin
      .from('users')
      .select('referral_code')
      .eq('id', userId)
      .single();

    if (userError || !userRow) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const referralCode = userRow.referral_code;

    // Count downline (users referred by this user)
    const { count, error: countError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', userId);

    if (countError) {
      res.status(500).json({ success: false, error: countError.message });
      return;
    }

    // Sum total earned from the user's own investments
    const { data: investments, error: invError } = await supabaseAdmin
      .from('user_investments')
      .select('total_earned')
      .eq('user_id', userId);

    if (invError) {
      res.status(500).json({ success: false, error: invError.message });
      return;
    }

    const totalEarned = (investments ?? []).reduce(
      (sum: number, inv: { total_earned: number }) => sum + (inv.total_earned || 0),
      0
    );

    res.json({
      success: true,
      data: {
        referral_code: referralCode,
        referral_link: `https://yellowcex.com/register?ref=${referralCode}`,
        downline_count: count ?? 0,
        total_earned: totalEarned,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
