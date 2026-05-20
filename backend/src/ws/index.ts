import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { WsMessage, WsEventType, PriceUpdate, OrderbookUpdate } from '@yellowcex/shared';
import type { TradingPair } from '@yellowcex/shared';
import { TRADING_PAIRS } from '@yellowcex/shared';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { binanceFeed } from '../services/binanceFeed';
import { orderbookEngine } from '../services/orderbook';

interface WsClient {
  ws: WebSocket;
  userId?: string;
  subscribedPairs: Set<string>;
}

class WsManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WsClient> = new Set();
  private orderbookInterval: ReturnType<typeof setInterval> | null = null;

  init(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const client: WsClient = { ws, subscribedPairs: new Set(['all']) };

      // Authenticate via token in query string
      const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (token) {
        try {
          const payload = jwt.verify(token, config.jwt.secret) as { userId: string; email: string };
          client.userId = payload.userId;
        } catch {
          // Allow unauthenticated for public feeds
        }
      }

      this.clients.add(client);

      // Send cached prices for all pairs immediately on connect
      for (const pair of TRADING_PAIRS) {
        const ticker = binanceFeed.getLatestPrice(pair);
        if (ticker) {
          ws.send(JSON.stringify({
            type: 'price_update',
            payload: {
              pair,
              price: ticker.c,
              change24h: ticker.p,
              changePercent24h: ticker.P,
              high24h: ticker.h,
              low24h: ticker.l,
              volume24h: ticker.v,
            },
            timestamp: Date.now(),
          }));
        }
      }

      ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'subscribe' && msg.pair) {
            client.subscribedPairs.add(msg.pair);
          } else if (msg.type === 'unsubscribe' && msg.pair) {
            client.subscribedPairs.delete(msg.pair);
          }
        } catch {
          // Ignore
        }
      });

      ws.on('close', () => {
        this.clients.delete(client);
      });

      ws.on('error', (err) => {
        this.clients.delete(client);
      });
    });

    // Subscribe to Binance price updates and broadcast
    binanceFeed.onPrice((pair, data) => {
      this.broadcast(pair, 'price_update', {
        pair,
        price: data.price,
        change24h: data.change24h,
        changePercent24h: data.changePercent24h,
        high24h: data.high24h,
        low24h: data.low24h,
        volume24h: data.volume24h,
      } as PriceUpdate);
    });

    // Send order book snapshots periodically for all trading pairs
    this.orderbookInterval = setInterval(() => {
      for (const pair of TRADING_PAIRS) {
        const ob = orderbookEngine.getOrderBook(pair);
        this.broadcast(pair, 'orderbook_update', {
          pair: ob.pair,
          bids: ob.bids.map((b) => [b.price, b.amount] as [string, string]),
          asks: ob.asks.map((a) => [a.price, a.amount] as [string, string]),
        } as OrderbookUpdate);
      }
    }, 1000);
  }

  shutdown(): void {
    if (this.orderbookInterval) {
      clearInterval(this.orderbookInterval);
      this.orderbookInterval = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  broadcast(pair: string, type: WsEventType, payload: unknown): void {
    const message: WsMessage = {
      type,
      payload,
      timestamp: Date.now(),
    };
    const raw = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (client.subscribedPairs.has('all') || client.subscribedPairs.has(pair)) {
          client.ws.send(raw);
        }
      }
    }
  }

  sendToUser(userId: string, type: WsEventType, payload: unknown): void {
    const message: WsMessage = { type, payload, timestamp: Date.now() };
    const raw = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(raw);
      }
    }
  }
}

export const wsManager = new WsManager();
