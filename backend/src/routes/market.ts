import { Router, Request, Response } from 'express';
import { config } from '../config';

const router = Router();

// GET /api/market/candles?symbol=BTCUSDT&interval=1m&limit=200
// Proxies Binance klines (REST)
router.get('/candles', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'BTCUSDT';
    const interval = (req.query.interval as string) || '1m';
    const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);

    const url = `${config.binance.restUrl}/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
      res.status(502).json({ success: false, error: `Binance API error: ${response.status}` });
      return;
    }

    const raw: unknown = await response.json();

    if (!Array.isArray(raw)) {
      res.status(502).json({ success: false, error: 'Unexpected response from Binance' });
      return;
    }

    // Transform Binance klines to compact format
    // [openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBase, takerBuyQuote, ignore]
    const candles = (raw as unknown[][]).map((k) => ({
      t: Math.floor(Number(k[0]) / 1000),
      o: String(k[1]),
      h: String(k[2]),
      l: String(k[3]),
      c: String(k[4]),
      v: String(k[5]),
    }));

    res.json({ success: true, data: candles });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/market/ticker/24hr?symbol=BTCUSDT
// Proxies Binance 24hr ticker (REST)
router.get('/ticker/24hr', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'BTCUSDT';

    const url = `${config.binance.restUrl}/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`;

    const response = await fetch(url);
    if (!response.ok) {
      res.status(502).json({ success: false, error: `Binance API error: ${response.status}` });
      return;
    }

    const data = await response.json() as Record<string, string>;

    res.json({
      success: true,
      data: {
        symbol: data.symbol,
        priceChange: data.priceChange,
        priceChangePercent: data.priceChangePercent,
        lastPrice: data.lastPrice,
        highPrice: data.highPrice,
        lowPrice: data.lowPrice,
        volume: data.volume,
        quoteVolume: data.quoteVolume,
        openPrice: data.openPrice,
        prevClosePrice: data.prevClosePrice,
        openTime: data.openTime,
        closeTime: data.closeTime,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/market/depth?symbol=BTCUSDT&limit=20
// Proxies Binance order book depth (REST)
router.get('/depth', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'BTCUSDT';
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const url = `${config.binance.restUrl}/api/v3/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
      res.status(502).json({ success: false, error: `Binance API error: ${response.status}` });
      return;
    }

    const data = await response.json() as { bids: string[][]; asks: string[][] };

    res.json({
      success: true,
      data: {
        bids: data.bids.map((b) => [b[0], b[1]] as [string, string]),
        asks: data.asks.map((a) => [a[0], a[1]] as [string, string]),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
