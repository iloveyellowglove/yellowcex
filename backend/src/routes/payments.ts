import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createDepositInvoice, getUserDeposits, createWithdrawal, getUserWithdrawals } from '../services/plisioService';

const router = Router();
router.use(authMiddleware);

// Create deposit invoice
router.post('/deposit', async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const userId = req.user!.userId;

    if (!amount || !currency) {
      res.status(400).json({ success: false, message: 'amount and currency are required' });
      return;
    }

    const orderNumber = `DEP-${userId.slice(0, 8)}-${Date.now()}`;
    const result = await createDepositInvoice({
      userId,
      amount: String(amount),
      currency: currency.toUpperCase(),
      orderName: `Deposit ${currency.toUpperCase()}`,
      orderNumber,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Create deposit error:', err instanceof Error ? err.message : err);
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to create deposit' });
  }
});

// Get user deposit history
router.get('/deposits', async (req, res) => {
  try {
    const deposits = await getUserDeposits(req.user!.userId);
    res.json({ success: true, data: deposits });
  } catch (err) {
    console.error('Get deposits error:', err instanceof Error ? err.message : err);
    res.status(500).json({ success: false, message: 'Failed to fetch deposits' });
  }
});

// Create withdrawal
router.post('/withdraw', async (req, res) => {
  try {
    const { amount, currency, address } = req.body;

    if (!amount || !currency || !address) {
      res.status(400).json({ success: false, message: 'amount, currency, and address are required' });
      return;
    }

    const result = await createWithdrawal({
      userId: req.user!.userId,
      amount: String(amount),
      currency: currency.toUpperCase(),
      address,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Create withdrawal error:', err instanceof Error ? err.message : err);
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to create withdrawal' });
  }
});

// Get user withdrawal history
router.get('/withdrawals', async (req, res) => {
  try {
    const withdrawals = await getUserWithdrawals(req.user!.userId);
    res.json({ success: true, data: withdrawals });
  } catch (err) {
    console.error('Get withdrawals error:', err instanceof Error ? err.message : err);
    res.status(500).json({ success: false, message: 'Failed to fetch withdrawals' });
  }
});

export default router;
