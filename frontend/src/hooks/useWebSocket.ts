'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { WsMessage, TradingPair } from '@/types/shared';
import { usePriceStore, useOrderBookStore } from '../store/trading';
import { getWsUrl } from '../lib/api';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

let globalStatus: WsStatus = 'disconnected';
const statusListeners: Set<(s: WsStatus) => void> = new Set();

function setGlobalStatus(s: WsStatus) {
  globalStatus = s;
  statusListeners.forEach((fn) => fn(s));
}

export function getWsStatus(): WsStatus {
  return globalStatus;
}

export function useWebSocket(pair?: TradingPair) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const reconnectCount = useRef(0);
  const mountedRef = useRef(true);
  const setPrice = usePriceStore((s) => s.setPrice);
  const setOrderBook = useOrderBookStore((s) => s.setOrderBook);
  const [status, setStatus] = useState<WsStatus>(globalStatus);

  useEffect(() => {
    statusListeners.add(setStatus);
    return () => { statusListeners.delete(setStatus); };
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const url = getWsUrl();
    if (!url) return;

    setGlobalStatus('connecting');
    reconnectCount.current += 1;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectCount.current = 0;
      setGlobalStatus('connected');
      if (pair) {
        ws.send(JSON.stringify({ type: 'subscribe', pair }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);

        if (msg.type === 'price_update') {
          const payload = msg.payload as {
            pair: string;
            price: string;
            change24h: string;
            changePercent24h: string;
            high24h: string;
            low24h: string;
            volume24h: string;
          };
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
          const payload = msg.payload as {
            pair: string;
            bids: [string, string][];
            asks: [string, string][];
          };
          if (payload.bids && payload.asks) {
            setOrderBook(payload.bids, payload.asks);
          }
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setGlobalStatus('disconnected');
      wsRef.current = null;
      if (!mountedRef.current) return;

      // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
      const delay = Math.min(2000 * Math.pow(2, reconnectCount.current - 1), 30000);
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [setPrice, setOrderBook, pair]);

  // Connect on mount, reconnect on pair change
  useEffect(() => {
    mountedRef.current = true;

    // If a pair is specified, close existing and reconnect with subscribe
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && pair) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', pair }));
    } else if (!wsRef.current || wsRef.current.readyState > WebSocket.OPEN) {
      connect();
    }

    // REST fallback: fetch prices in parallel while WS warms up
    const prices = usePriceStore.getState().prices;
    if (Object.keys(prices).length === 0) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      fetch(`${apiBase}/api/markets`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            for (const m of json.data) {
              setPrice(m.pair as TradingPair, {
                price: m.lastPrice ?? '0',
                change24h: m.priceChange24h ?? '0',
                changePercent24h: m.priceChangePercent24h ?? '0',
                high24h: m.high24h ?? '0',
                low24h: m.low24h ?? '0',
                volume24h: m.volume24h ?? '0',
              });
            }
          }
        })
        .catch(() => { /* ignore, WS will populate */ });
    }

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect, pair, setPrice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  return { status, wsRef };
}
