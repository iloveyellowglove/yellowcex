import WebSocket from 'ws';
import { PAIR_TO_BINANCE_SYMBOL } from '@yellowcex/shared';
import { config } from '../config';
import type { TradingPair } from '@yellowcex/shared';

interface TickerData {
  e: string;
  E: number;
  s: string;
  p: string;
  P: string;
  w: string;
  c: string;
  Q: string;
  o: string;
  h: string;
  l: string;
  v: string;
  q: string;
}

type PriceCallback = (pair: TradingPair, data: {
  price: string;
  change24h: string;
  changePercent24h: string;
  high24h: string;
  low24h: string;
  volume24h: string;
}) => void;

class BinanceFeed {
  private ws: WebSocket | null = null;
  private listeners: PriceCallback[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly SYMBOLS: string[];
  private latestPrices: Map<string, TickerData> = new Map();

  constructor() {
    this.SYMBOLS = Object.values(PAIR_TO_BINANCE_SYMBOL);
  }

  async connect(): Promise<void> {
    // Pre-fetch latest prices via REST so cache is warm before WS connects
    await this.fetchInitialPrices();

    const url = `${config.binance.wsUrl}/${this.SYMBOLS.map((s) => `${s}@ticker`).join('/')}`;

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('Connected to Binance WebSocket feed');
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const ticker: TickerData = JSON.parse(data.toString());
        this.latestPrices.set(ticker.s, ticker);

        const pair = this.findPairFromSymbol(ticker.s);
        if (pair) {
          this.notify(pair, {
            price: ticker.c,
            change24h: ticker.p,
            changePercent24h: ticker.P,
            high24h: ticker.h,
            low24h: ticker.l,
            volume24h: ticker.v,
          });
        }
      } catch {
        // Ignore parse errors
      }
    });

    this.ws.on('close', () => {
      console.log('Binance WebSocket disconnected, reconnecting in 5s...');
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      console.error('Binance WebSocket error:', err.message);
      this.ws?.close();
    });
  }

  private findPairFromSymbol(symbol: string): TradingPair | null {
    for (const [pair, binanceSymbol] of Object.entries(PAIR_TO_BINANCE_SYMBOL)) {
      if (binanceSymbol === symbol.toLowerCase()) return pair as TradingPair;
    }
    return null;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
  }

  onPrice(callback: PriceCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify(pair: TradingPair, data: {
    price: string;
    change24h: string;
    changePercent24h: string;
    high24h: string;
    low24h: string;
    volume24h: string;
  }): void {
    for (const listener of this.listeners) {
      try {
        listener(pair, data);
      } catch (err) {
        console.error('Binance feed listener error:', err);
      }
    }
  }

  getLatestPrice(pair: TradingPair): TickerData | undefined {
    const symbol = PAIR_TO_BINANCE_SYMBOL[pair];
    return this.latestPrices.get(symbol);
  }

  private async fetchInitialPrices(): Promise<void> {
    try {
      const symbols = this.SYMBOLS.map((s) => s.toUpperCase());
      const results = await Promise.all(
        symbols.map(async (symbol) => {
          const url = `${config.binance.restUrl}/api/v3/ticker/24hr?symbol=${symbol}`;
          const res = await fetch(url);
          if (!res.ok) return null;
          const data = await res.json() as Record<string, string>;
          // Map REST fields to TickerData (WS format)
          return {
            e: '24hrTicker',
            E: 0,
            s: data.symbol?.toLowerCase() || symbol.toLowerCase(),
            p: data.priceChange || '0',
            P: data.priceChangePercent || '0',
            w: data.weightedAvgPrice || '0',
            c: data.lastPrice || '0',
            Q: data.lastQty || '0',
            o: data.openPrice || '0',
            h: data.highPrice || '0',
            l: data.lowPrice || '0',
            v: data.volume || '0',
            q: data.quoteVolume || '0',
          } as TickerData;
        })
      );
      let cached = 0;
      for (const ticker of results) {
        if (ticker) {
          this.latestPrices.set(ticker.s, ticker);
          cached++;
        }
      }
      console.log(`Binance REST pre-fetch: cached ${cached}/${results.length} prices`);
    } catch (err) {
      console.error('Binance REST pre-fetch error:', err instanceof Error ? err.message : err);
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export const binanceFeed = new BinanceFeed();
