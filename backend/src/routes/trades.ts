import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/trades
router.get('/', async (req: Request, res: Response) => {
  try {
    const pair = req.query.pair as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    let query = supabaseAdmin
      .from('trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (pair) query = query.eq('pair', pair);

    const { data, error } = await query;

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/trades/my
router.get('/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const pair = req.query.pair as string | undefined;

    let query = supabaseAdmin
      .from('trades')
      .select('*', { count: 'exact' })
      .or(`buyer_id.eq.${req.user!.userId},seller_id.eq.${req.user!.userId}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (pair) query = query.eq('pair', pair);

    const { data, count, error } = await query;

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
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
