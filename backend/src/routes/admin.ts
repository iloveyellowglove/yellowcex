import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All admin routes require auth
router.use(authMiddleware);

// Middleware: check user is admin (by email domain or env variable)
async function adminCheck(req: Request, res: Response, next: Function): Promise<void> {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);
  if (adminEmails.length > 0 && req.user?.email && adminEmails.includes(req.user.email)) {
    next();
    return;
  }
  // In development, allow all authenticated users as admins
  if (process.env.NODE_ENV === 'development') {
    next();
    return;
  }
  res.status(403).json({ success: false, error: 'Admin access required' });
}

// GET /api/admin/users
router.get('/users', adminCheck, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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

// GET /api/admin/users/:id
router.get('/users/:id', adminCheck, async (req: Request, res: Response) => {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Get balances
    const { data: balances } = await supabaseAdmin
      .from('balances')
      .select('*')
      .eq('user_id', user.id);

    // Get wallets
    const { data: wallets } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id);

    res.json({
      success: true,
      data: { user, balances, wallets },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/kyc
router.get('/kyc', adminCheck, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string || 'pending';
    const { data, error } = await supabaseAdmin
      .from('kyc_documents')
      .select('*')
      .eq('status', status)
      .order('submitted_at', { ascending: false });

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/kyc/:id
router.put('/kyc/:id', adminCheck, async (req: Request, res: Response) => {
  try {
    const { status, reviewer_notes } = req.body;
    const { data: doc, error } = await supabaseAdmin
      .from('kyc_documents')
      .update({
        status,
        reviewer_notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error || !doc) {
      res.status(500).json({ success: false, error: error?.message || 'Update failed' });
      return;
    }

    // Update user's KYC status
    await supabaseAdmin
      .from('users')
      .update({ kyc_status: status })
      .eq('id', doc.user_id);

    res.json({ success: true, data: doc });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/orders
router.get('/orders', adminCheck, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    let query = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

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
