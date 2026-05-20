import crypto from 'crypto';
import { config } from '../config';

const API = config.plisio.apiUrl;

interface PlisioInvoice {
  txn_id: string;
  invoice_url: string;
  amount: string;
  currency: string;
  status: string;
}

interface PlisioWithdrawal {
  id: string;
  amount: string;
  currency: string;
  status: string;
  txn_id: string | null;
}

interface PlisioError {
  status: string;
  message: string;
}

function sign(): string {
  return config.plisio.secretKey;
}

async function apiCall<T>(method: string, params: Record<string, string>): Promise<T> {
  const form = new URLSearchParams(params);
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as PlisioError;
    throw new Error(err.message || `Plisio ${method} failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function verifyIpnSignature(body: unknown, verifyHash: string): boolean {
  const json = JSON.stringify(body);
  const expected = crypto.createHash('md5').update(json + sign()).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(verifyHash));
}

export async function createDepositInvoice(params: {
  userId: string;
  amount: string;
  currency: string;
  orderName: string;
  orderNumber: string;
}): Promise<{ invoiceUrl: string; invoiceId: string; amount: string }> {
  const res = await apiCall<PlisioInvoice>('invoices', {
    api_key: sign(),
    order_number: params.orderNumber,
    order_name: params.orderName,
    source_currency: params.currency,
    source_amount: params.amount,
    currency: params.currency,
    amount: params.amount,
    email: '',
  });

  // Insert deposit record
  await supabasePost('plisio_deposits', {
    user_id: params.userId,
    invoice_id: res.txn_id,
    amount: res.amount,
    currency: params.currency,
    status: 'pending',
  });

  // Also create a pending transaction
  await supabasePost('transactions', {
    user_id: params.userId,
    type: 'deposit',
    currency: params.currency,
    amount: res.amount,
    status: 'pending',
    tx_hash: res.txn_id,
  });

  return { invoiceUrl: res.invoice_url, invoiceId: res.txn_id, amount: res.amount };
}

export async function processDepositCallback(body: {
  txn_id: string;
  status: string;
  amount: string;
  currency: string;
  source_currency: string;
  source_amount: string;
}): Promise<void> {
  const { txn_id, status, amount, currency, source_currency, source_amount } = body;

  const deposits = await supabaseGet<Array<{
    id: string;
    user_id: string;
    invoice_id: string;
    currency: string;
    status: string;
  }>>(`plisio_deposits?invoice_id=eq.${encodeURIComponent(txn_id)}`);

  if (!deposits || deposits.length === 0) {
    console.error('Plisio callback: deposit not found for invoice', txn_id);
    return;
  }

  const deposit = deposits[0];

  if (status === 'completed' || status === 'confirmed') {
    if (deposit.status === 'confirmed') return; // already processed

    // Update deposit record
    await supabasePatch('plisio_deposits', {
      status: 'confirmed',
      source_currency,
      source_amount,
    }, 'id', deposit.id);

    // Update transaction
    const txn = await supabaseGet<Array<{ id: string }>>(`transactions?tx_hash=eq.${encodeURIComponent(txn_id)}`);
    if (txn && txn.length > 0) {
      await supabasePatch('transactions', { status: 'completed' }, 'id', txn[0].id);
    }

    // Credit user balance
    const balances = await supabaseGet<Array<{ id: string; available: string; currency: string }>>(
      `balances?user_id=eq.${encodeURIComponent(deposit.user_id)}&currency=eq.${encodeURIComponent(deposit.currency)}`
    );

    if (balances && balances.length > 0) {
      const newAvailable = (parseFloat(balances[0].available) + parseFloat(amount)).toString();
      await supabasePatch('balances', { available: newAvailable }, 'id', balances[0].id);
    }
  } else if (status === 'expired' || status === 'cancelled') {
    await supabasePatch('plisio_deposits', { status }, 'id', deposit.id);
    const txn = await supabaseGet<Array<{ id: string }>>(`transactions?tx_hash=eq.${encodeURIComponent(txn_id)}`);
    if (txn && txn.length > 0) {
      await supabasePatch('transactions', { status: 'failed' }, 'id', txn[0].id);
    }
  }
}

export async function createWithdrawal(params: {
  userId: string;
  amount: string;
  currency: string;
  address: string;
}): Promise<{ withdrawalId: string; status: string }> {
  const { userId, amount, currency, address } = params;

  // Verify sufficient balance
  const balances = await supabaseGet<Array<{ id: string; available: string }>>(
    `balances?user_id=eq.${encodeURIComponent(userId)}&currency=eq.${encodeURIComponent(currency)}`
  );

  if (!balances || balances.length === 0 || parseFloat(balances[0].available) < parseFloat(amount)) {
    throw new Error('Insufficient balance');
  }

  // Deduct balance
  const newAvailable = (parseFloat(balances[0].available) - parseFloat(amount)).toString();
  await supabasePatch('balances', { available: newAvailable }, 'id', balances[0].id);

  // Create withdrawal via Plisio
  const res = await apiCall<PlisioWithdrawal>('withdraw', {
    api_key: sign(),
    currency,
    amount,
    address,
    network: currency === 'ETH' || currency === 'USDT' ? 'eth' : 'default',
  });

  // Record withdrawal
  await supabasePost('plisio_withdrawals', {
    user_id: userId,
    withdrawal_id: res.id,
    amount,
    currency,
    address,
    status: res.status || 'processing',
    txn_id: res.txn_id || null,
  });

  // Create transaction record
  await supabasePost('transactions', {
    user_id: userId,
    type: 'withdrawal',
    currency,
    amount: `-${amount}`,
    status: res.status === 'completed' ? 'completed' : 'pending',
    tx_hash: res.txn_id || res.id,
    withdrawal_address: address,
  });

  return { withdrawalId: res.id, status: res.status || 'processing' };
}

export async function getExchangeRate(from: string, to: string): Promise<number> {
  const res = await apiCall<{ rate: string }>('rates', {
    api_key: sign(),
    source: from,
    target: to,
  });
  return parseFloat(res.rate);
}

export async function getUserDeposits(userId: string) {
  return supabaseGet<Array<Record<string, unknown>>>(
    `plisio_deposits?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`
  );
}

export async function getUserWithdrawals(userId: string) {
  return supabaseGet<Array<Record<string, unknown>>>(
    `plisio_withdrawals?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`
  );
}

// Shared Supabase REST helpers
const supabaseHeaders = {
  apikey: config.supabase.serviceRoleKey,
  Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
  'Content-Type': 'application/json',
};

async function supabaseGet<T>(path: string): Promise<T> {
  const res = await fetch(`${config.supabase.url}/rest/v1/${path}`, { headers: supabaseHeaders });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `Supabase GET ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function supabasePost<T>(table: string, body: unknown): Promise<T> {
  const res = await fetch(`${config.supabase.url}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `Supabase POST ${table} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function supabasePatch(table: string, body: unknown, eqCol: string, eqVal: string): Promise<void> {
  const res = await fetch(
    `${config.supabase.url}/rest/v1/${table}?${eqCol}=eq.${encodeURIComponent(eqVal)}`,
    {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `Supabase PATCH ${table} failed: ${res.status}`);
  }
}
