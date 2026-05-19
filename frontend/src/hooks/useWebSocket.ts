'use client';

import { useEffect, useRef } from 'react';
import type { WsMessage } from '@yellowcex/shared';
import { usePriceStore, useOrderBookStore } from '../store/trading';
import { getWsUrl } from '../lib/api';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const setPrice = usePriceStore((s) => s.setPrice);
  const setOrderBook = useOrderBookStore((s) => s.setOrderBook);

  useEffect(() => {
    const url = getWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);

        if (msg.type === 'price_update') {
          const payload = msg.payload as any;
          if (payload.pair && payload.price) {
            setPrice(payload.pair, {
              price: payload.price,
              change24h: payload.change24h || '0',
              changePercent24h: payload.changePercent24h || '0',
              high24h: payload.high24h || '0',
              low24h: payload.low24h || '0',
              volume24h: payload.volume24h || '0',
            });
          }
        } else if (msg.type === 'orderbook_update') {
          const payload = msg.payload as any;
          if (payload.bids && payload.asks) {
            setOrderBook(payload.bids, payload.asks);
          }
        }
      } catch {
        // Ignore
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting in 3s...');
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          // Reconnect
        }
      }, 3000);
    };

    return () => {
      ws.close();
    };
  }, [setPrice, setOrderBook]);

  return wsRef;
}
