import { ethers } from 'ethers';
import { config } from '../config';
import { supabaseAdmin } from '../db/supabase';
import type { Currency } from '@yellowcex/shared';

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

const mnemonic = process.env.HD_WALLET_MNEMONIC || ethers.Wallet.createRandom().mnemonic!.phrase;

class WalletService {
  private masterWallet: ethers.HDNodeWallet;

  constructor() {
    this.masterWallet = ethers.Wallet.fromPhrase(mnemonic)!;
  }

  getProvider(currency: Currency): ethers.JsonRpcProvider {
    if (currency === 'BNB') return bscProvider;
    return ethProvider;
  }

  async deriveAddress(userId: string, currency: Currency, index: number): Promise<string> {
    const path = `m/44'/60'/${index}'/0/0`;
    const child = this.masterWallet.derivePath(path);
    return child.address;
  }

  async createWallet(userId: string, currency: Currency): Promise<{ address: string }> {
    const { count } = await supabaseAdmin
      .from('wallets')
      .select('*', { count: 'exact', head: true });

    const index = (count ?? 0);
    const address = await this.deriveAddress(userId, currency, index);

    const { error } = await supabaseAdmin.from('wallets').insert({
      user_id: userId,
      currency,
      address,
      balance: '0',
    });

    if (error) throw new Error(`Failed to create wallet: ${error.message}`);

    await supabaseAdmin.from('balances').insert({
      user_id: userId,
      currency,
      available: '0',
      locked: '0',
    });

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

    const available = BigInt(balance.available);
    const locked = BigInt(balance.locked);
    const amountBN = BigInt(amount);

    if (available < amountBN) throw new Error(`Insufficient ${currency} balance`);

    await supabaseAdmin
      .from('balances')
      .update({
        available: (available - amountBN).toString(),
        locked: (locked + amountBN).toString(),
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

    const available = BigInt(balance.available);
    const locked = BigInt(balance.locked);
    const amountBN = BigInt(amount);

    await supabaseAdmin
      .from('balances')
      .update({
        available: (available + amountBN).toString(),
        locked: (locked - amountBN).toString(),
      })
      .eq('user_id', userId)
      .eq('currency', currency);
  }

  async settleTrade(
    buyerId: string,
    sellerId: string,
    baseCurrency: Currency,
    quoteCurrency: Currency,
    amount: string,
    price: string
  ): Promise<void> {
    const totalQuote = ethers.formatEther(
      ethers.parseEther(amount) * ethers.parseEther(price) / ethers.parseEther('1')
    );

    // Transfer quote from buyer to seller
    await this.transferBalance(buyerId, quoteCurrency, totalQuote, 'trade_buy');
    await this.transferBalance(sellerId, quoteCurrency, totalQuote, 'trade_sell');

    // Transfer base from seller to buyer
    await this.transferBalance(buyerId, baseCurrency, amount, 'trade_buy');
    await this.transferBalance(sellerId, baseCurrency, amount, 'trade_sell');
  }

  private async transferBalance(
    userId: string,
    currency: string,
    amount: string,
    direction: 'trade_buy' | 'trade_sell'
  ): Promise<void> {
    const isIncoming = direction === 'trade_buy';
    const { data: balance } = await supabaseAdmin
      .from('balances')
      .select('available')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    if (!balance) throw new Error(`No balance record for ${currency}`);

    const current = BigInt(balance.available);
    const amountBN = BigInt(amount);

    if (!isIncoming && current < amountBN) {
      throw new Error(`Insufficient balance for settlement`);
    }

    const newBalance = isIncoming ? (current + amountBN).toString() : (current - amountBN).toString();

    await supabaseAdmin
      .from('balances')
      .update({ available: newBalance })
      .eq('user_id', userId)
      .eq('currency', currency);
  }

  async creditBalance(userId: string, currency: string, amount: string, txType: string): Promise<void> {
    const { data: balance } = await supabaseAdmin
      .from('balances')
      .select('available')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    const current = balance ? BigInt(balance.available) : BigInt(0);
    const amountBN = BigInt(amount);

    if (balance) {
      await supabaseAdmin
        .from('balances')
        .update({ available: (current + amountBN).toString() })
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
