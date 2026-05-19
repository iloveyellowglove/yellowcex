import { Router, Request, Response } from 'express';
import { TRADING_PAIRS, PAIR_TO_BINANCE_SYMBOL } from '@yellowcex/shared';
import type { TradingPair } from '@yellowcex/shared';
import { binanceFeed } from '../services/binanceFeed';
import { orderbookEngine } from '../services/orderbook';

const router = Router();

// GET /api/markets
router.get('/', (_req: Request, res: Response) => {
  const markets = TRADING_PAIRS.map((pair) => {
    const ticker = binanceFeed.getLatestPrice(pair);
    const lastPrice = orderbookEngine.getLastPrice(pair);

    return {
      pair,
      base: pair.split('/')[0],
      quote: pair.split('/')[1],
      lastPrice: ticker?.c ?? lastPrice ?? '0',
      priceChange24h: ticker?.p ?? '0',
      priceChangePercent24h: ticker?.P ?? '0',
      high24h: ticker?.h ?? '0',
      low24h: ticker?.l ?? '0',
      volume24h: ticker?.v ?? '0',
    };
  });

  res.json({ success: true, data: markets });
});

// GET /api/markets/:pair
router.get('/:pair', (req: Request, res: Response) => {
  const pair = req.params.pair as TradingPair;
  if (!TRADING_PAIRS.includes(pair)) {
    res.status(400).json({ success: false, error: 'Invalid trading pair' });
    return;
  }

  const ticker = binanceFeed.getLatestPrice(pair);
  const lastPrice = orderbookEngine.getLastPrice(pair);

  res.json({
    success: true,
    data: {
      pair,
      base: pair.split('/')[0],
      quote: pair.split('/')[1],
      lastPrice: ticker?.c ?? lastPrice ?? '0',
      priceChange24h: ticker?.p ?? '0',
      priceChangePercent24h: ticker?.P ?? '0',
      high24h: ticker?.h ?? '0',
      low24h: ticker?.l ?? '0',
      volume24h: ticker?.v ?? '0',
    },
  });
});

export default router;
