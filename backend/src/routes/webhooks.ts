import { Router } from 'express';
import { verifyIpnSignature, processDepositCallback } from '../services/plisioService';

const router = Router();

router.post('/plisio', async (req, res) => {
  try {
    const verifyHash = req.headers['verify_hash'] as string;

    if (!verifyHash) {
      res.status(400).json({ status: 'error', message: 'Missing verify_hash header' });
      return;
    }

    if (!verifyIpnSignature(req.body, verifyHash)) {
      console.warn('Plisio IPN: invalid signature');
      res.status(403).json({ status: 'error', message: 'Invalid signature' });
      return;
    }

    const { txn_id, status, amount, currency, source_currency, source_amount } = req.body;

    if (!txn_id) {
      res.status(400).json({ status: 'error', message: 'Missing txn_id' });
      return;
    }

    await processDepositCallback({
      txn_id,
      status: status || 'pending',
      amount: amount || '0',
      currency: currency || '',
      source_currency: source_currency || '',
      source_amount: source_amount || '0',
    });

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Plisio IPN error:', err instanceof Error ? err.message : err);
    res.status(500).json({ status: 'error', message: 'Internal error' });
  }
});

export default router;
