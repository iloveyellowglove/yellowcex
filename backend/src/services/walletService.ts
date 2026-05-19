import { ethers } from 'ethers';
import { config } from '../config';
import { supabaseAdmin } from '../db/supabase';
import type { Currency } from '@yellowcex/shared';
import { CURRENCY_DECIMALS } from '@yellowcex/shared';

const isTestnet = config.network === 'testnet';

const ethProvider = new ethers.JsonRpcProvider(
  isTestnet
    ? process.env.ETH_RPC || 'https://sepolia.infura.io/v3/your-key'
    : process.env.ETH_RPC || 'https://mainnet.infura.io/v3/your-key'
);

const bscProvider = new ethers.JsonRpcProvider(
  isTestnet
    ? 'https://data-seed-prebsc-1-s1.binance.org:8545'
    : 'https://bsc-dataseed.binance.org'
);

function getDecimals(currency: Currency): number {
  return CURRENCY_DECIMALS[currency] ?? 18;
}

function decimalToSmallestUnit(amount: string, currency: Currency): bigint {
  const decimals = getDecimals(currency);
  const parts = amount.split('.');
  const integer = parts[0].replace(/^0+/, '') || '0';
  const fraction = (parts[1] ?? '').padEnd(decimals, '0').slice(0, decimals);
  const combined = integer + fraction;
  return BigInt(combined || '0');
}

function smallestUnitToDecimal(amount: bigint, currency: Currency): string {
  const decimals = getDecimals(currency);
  const isNeg = amount < 0n;
  const abs = (isNeg ? -amount : amount).toString().padStart(decimals + 1, '0');
  const integerPart = abs.slice(0, abs.length - decimals);
  const fractionPart = abs.slice(abs.length - decimals);
  const decimal = integerPart + '.' + fractionPart;
  return (isNeg ? '-' : '') + decimal.replace(/\.?0+$/, '').replace(/^0+(?=\d)/, '');
}

class WalletService {
  getProvider(currency: Currency): ethers.JsonRpcProvider {
    if (currency === 'BNB') return bscProvider;
    return ethProvider;
  }

  private deriveAddress(index: number): string {
    const seed = ethers.Mnemonic.fromPhrase(config.hdWallet.mnemonic).computeSeed();
    const root = ethers.HDNodeWallet.fromSeed(seed);
    const path = `m/44'/60'/0'/0/${index}`;
    const child = root.derivePath(path);
    return child.address;
  }

  async createWallet(userId: string, currency: Currency): Promise<{ address: string }> {
    const { data: existing } = await supabaseAdmin
      .from('wallets')
      .select('address')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    if (existing) return { address: existing.address };

    const { count } = await supabaseAdmin
      .from('wallets')
      .select('*', { count: 'exact', head: true });

    const index = (count ?? 0);
    const address = this.deriveAddress(index);

    const { error: wErr } = await supabaseAdmin.from('wallets').insert({
      user_id: userId,
      currency,
      address,
      balance: '0',
    });

    if (wErr) throw new Error(`Failed to create wallet: ${wErr.message}`);

    const { data: bal } = await supabaseAdmin
      .from('balances')
      .select('id')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    if (!bal) {
      await supabaseAdmin.from('balances').insert({
        user_id: userId,
        currency,
        available: '0',
        locked: '0',
      });
    }

    return { address };
  }

  async getOrCreateWallet(userId: string, currency: Currency): Promise<string> {
    const { data } = await supabaseAdmin
      .from('wallets')
      .select('address')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    if (data) return data.address;

    const wallet = await this.createWallet(userId, currency);
    return wallet.address;
  }

  async getBalance(userId: string, currency: Currency): Promise<{ available: string; locked: string }> {
    const { data } = await supabaseAdmin
      .from('balances')
      .select('available, locked')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    return data ?? { available: '0', locked: '0' };
  }

  async getBalances(userId: string): Promise<Array<{ currency: Currency; available: string; locked: string }>> {
    const { data } = await supabaseAdmin
      .from('balances')
      .select('currency, available, locked')
      .eq('user_id', userId);

    return (data ?? []) as Array<{ currency: Currency; available: string; locked: string }>;
  }

  async lockBalance(userId: string, currency: string, amount: string): Promise<void> {
    const { data: balance } = await supabaseAdmin
      .from('balances')
      .select('available, locked')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    if (!balance) throw new Error(`No balance record for ${currency}`);

    const available = decimalToSmallestUnit(balance.available, currency as Currency);
    const locked = decimalToSmallestUnit(balance.locked, currency as Currency);
    const amountBN = decimalToSmallestUnit(amount, currency as Currency);

    if (available < amountBN) throw new Error(`Insufficient ${currency} balance`);

    await supabaseAdmin
      .from('balances')
      .update({
        available: smallestUnitToDecimal(available - amountBN, currency as Currency),
        locked: smallestUnitToDecimal(locked + amountBN, currency as Currency),
      })
      .eq('user_id', userId)
      .eq('currency', currency);
  }

  async unlockBalance(userId: string, currency: string, amount: string): Promise<void> {
    const { data: balance } = await supabaseAdmin
      .from('balances')
      .select('available, locked')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    if (!balance) throw new Error(`No balance record for ${currency}`);

    const available = decimalToSmallestUnit(balance.available, currency as Currency);
    const locked = decimalToSmallestUnit(balance.locked, currency as Currency);
    const amountBN = decimalToSmallestUnit(amount, currency as Currency);

    await supabaseAdmin
      .from('balances')
      .update({
        available: smallestUnitToDecimal(available + amountBN, currency as Currency),
        locked: smallestUnitToDecimal(locked - amountBN, currency as Currency),
      })
      .eq('user_id', userId)
      .eq('currency', currency);
  }

  async transferBalance(
    userId: string,
    currency: string,
    amount: string,
    direction: 'credit' | 'debit'
  ): Promise<void> {
    const cur = currency as Currency;
    const { data: balance } = await supabaseAdmin
      .from('balances')
      .select('available')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    if (!balance) throw new Error(`No balance record for ${currency}`);

    const current = decimalToSmallestUnit(balance.available, cur);
    const amountBN = decimalToSmallestUnit(amount, cur);

    if (direction === 'debit' && current < amountBN) {
      throw new Error(`Insufficient balance for settlement`);
    }

    const newBalance = direction === 'credit'
      ? current + amountBN
      : current - amountBN;

    await supabaseAdmin
      .from('balances')
      .update({ available: smallestUnitToDecimal(newBalance, cur) })
      .eq('user_id', userId)
      .eq('currency', currency);
  }

  async settleTrade(
    buyerId: string,
    sellerId: string,
    baseCurrency: string,
    quoteCurrency: string,
    amount: string,
    price: string
  ): Promise<void> {
    const amt = decimalToSmallestUnit(amount, baseCurrency as Currency);
    const prc = decimalToSmallestUnit(price, quoteCurrency as Currency);
    const baseDec = getDecimals(baseCurrency as Currency);
    const quoteDec = getDecimals(quoteCurrency as Currency);

    // totalQuote = amount * price (in quote's smallest units)
    const totalQuoteBN = (amt * prc) / (10n ** BigInt(baseDec));

    const totalQuoteFormatted = smallestUnitToDecimal(totalQuoteBN, quoteCurrency as Currency);

    await this.transferBalance(buyerId, quoteCurrency, totalQuoteFormatted, 'debit');
    await this.transferBalance(sellerId, quoteCurrency, totalQuoteFormatted, 'credit');
    await this.transferBalance(sellerId, baseCurrency, amount, 'debit');
    await this.transferBalance(buyerId, baseCurrency, amount, 'credit');
  }

  async creditBalance(userId: string, currency: string, amount: string, txType: string): Promise<void> {
    const cur = currency as Currency;
    const { data: balance } = await supabaseAdmin
      .from('balances')
      .select('available')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    const current = balance
      ? decimalToSmallestUnit(balance.available, cur)
      : 0n;
    const amountBN = decimalToSmallestUnit(amount, cur);

    if (balance) {
      await supabaseAdmin
        .from('balances')
        .update({ available: smallestUnitToDecimal(current + amountBN, cur) })
        .eq('user_id', userId)
        .eq('currency', currency);
    } else {
      await supabaseAdmin.from('balances').insert({
        user_id: userId,
        currency,
        available: amount,
        locked: '0',
      });
    }

    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      type: txType,
      currency,
      amount,
      status: 'completed',
    });
  }
}

export const walletService = new WalletService();
