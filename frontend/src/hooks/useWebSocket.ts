'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { WsMessage, TradingPair } from '@/types/shared';
import { usePriceStore, useOrderBookStore } from '../store/trading';
import { getWsUrl } from '../lib/api';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const setPrice = usePriceStore((s) => s.setPrice);
  const setOrderBook = useOrderBookStore((s) => s.setOrderBook);

  const connect = useCallback(() => {
    const url = getWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      // Connected
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);

        if (msg.type === 'price_update') {
          const payload = msg.payload as { pair: string; price: string; change24h: string; changePercent24h: string; high24h: string; low24h: string; volume24h: string };
          if (payload.pair && payload.price) {
            setPrice(payload.pair as TradingPair, {
              price: payload.price,
              change24h: payload.change24h || '0',
              changePercent24h: payload.changePercent24h || '0',
              high24h: payload.high24h || '0',
              low24h: payload.low24h || '0',
              volume24h: payload.volume24h || '0',
            });
          }
        } else if (msg.type === 'orderbook_update') {
          const payload = msg.payload as { bids: [string, string][]; asks: [string, string][] };
          if (payload.bids && payload.asks) {
            setOrderBook(payload.bids, payload.asks);
          }
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      // Reconnect after 3 seconds
      reconnectTimer.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          connect();
        }
      }, 3000);
    };
  }, [setPrice, setOrderBook]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return wsRef;
}
