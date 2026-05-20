'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type CandlestickData, type Time } from 'lightweight-charts';
import { usePriceStore } from '../../store/trading';
import { PAIR_TO_BINANCE_SYMBOL, type TradingPair } from '@/types/shared';

interface Props {
  pair: TradingPair;
}

function binanceSymbol(pair: TradingPair): string {
  return PAIR_TO_BINANCE_SYMBOL[pair] || pair.replace('/', '').toLowerCase();
}

export function TradingChart({ pair }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const currentCandleRef = useRef<CandlestickData | null>(null);
  const candleDataRef = useRef<CandlestickData[]>([]);
  const pairRef = useRef(pair);
  pairRef.current = pair;

  const priceData = usePriceStore((s) => s.prices[pair]);
  const currentPrice = priceData?.price;

  // Initialize chart
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E11' },
        textColor: '#848E9C',
      },
      grid: {
        vertLines: { color: '#1E2329' },
        horzLines: { color: '#1E2329' },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: '#2B3139',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1E2329',
        },
        horzLine: {
          color: '#2B3139',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1E2329',
        },
      },
      rightPriceScale: {
        borderColor: '#2B3139',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: '#2B3139',
        timeVisible: true,
        secondsVisible: false,
      },
      width: container.clientWidth || 400,
      height: container.clientHeight || 300,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderUpColor: '#0ECB81',
      borderDownColor: '#F6465D',
      wickUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    // ResizeObserver for proper container sizing
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && chartRef.current) {
          chartRef.current.applyOptions({ width, height });
        }
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      currentCandleRef.current = null;
    };
  }, []);

  // Fetch historical klines on pair change
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    let cancelled = false;

    async function fetchKlines(fetchPair: TradingPair) {
      const symbol = binanceSymbol(fetchPair);
      currentCandleRef.current = null;
      candleDataRef.current = [];

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/market/candles?symbol=${symbol}&interval=1m&limit=300`
        );
        const json = await res.json();
        if (cancelled || !json.success || !Array.isArray(json.data)) return;

        const raw = json.data as { t: number; o: string; h: string; l: string; c: string; v: string }[];

        // Convert to lightweight-charts format, deduplicate by time, sort ascending
        const seen = new Set<number>();
        const data: CandlestickData[] = [];

        for (const c of raw) {
          const t = typeof c.t === 'number' ? c.t : Math.floor(Number(c.t));
          if (seen.has(t)) continue;
          seen.add(t);

          const open = parseFloat(c.o);
          const high = parseFloat(c.h);
          const low = parseFloat(c.l);
          const close = parseFloat(c.c);

          if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) continue;

          data.push({ time: t as Time, open, high, low, close });
        }

        if (data.length > 0) {
          data.sort((a, b) => (a.time as number) - (b.time as number));
          candleDataRef.current = data;
          series.setData(data);

          // Fit content
          chartRef.current?.timeScale().fitContent();
        }
      } catch {
        // Silently fail
      }
    }

    fetchKlines(pair);

    return () => {
      cancelled = true;
    };
  }, [pair]);

  // Update current candle from live WebSocket price ticks
  useEffect(() => {
    if (!currentPrice || !seriesRef.current) return;

    const priceVal = parseFloat(currentPrice);
    if (!priceVal || priceVal <= 0) return;

    const series = seriesRef.current;
    const now = Math.floor(Date.now() / 1000) as Time;
    const candleTime = (Math.floor(Number(now) / 60) * 60) as Time;

    let current = currentCandleRef.current;

    // Check if we need a new candle (crossed minute boundary)
    if (!current || current.time !== candleTime) {
      const open = current ? current.close : priceVal;

      current = {
        time: candleTime,
        open,
        high: Math.max(open, priceVal),
        low: Math.min(open, priceVal),
        close: priceVal,
      };

      currentCandleRef.current = current;
      // Append the closed candle to stored data
      if (currentCandleRef.current && current.time !== candleTime) {
        candleDataRef.current.push(current);
      }
    } else {
      // Mutate the current candle object in place
      if (priceVal > current.high) current.high = priceVal;
      if (priceVal < current.low) current.low = priceVal;
      current.close = priceVal;
    }

    // Update chart — lightweight-charts copies values on update()
    series.update({ ...current });
  }, [currentPrice]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2B3139] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">{pair}</span>
          {currentPrice && (
            <span className="text-sm font-mono text-[#0ECB81]">
              ${parseFloat(currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
            </span>
          )}
        </div>
        {priceData && (
          <div className="flex items-center gap-3 text-[10px] text-[#848E9C]">
            <span>24h H: {parseFloat(priceData.high24h).toLocaleString()}</span>
            <span>24h L: {parseFloat(priceData.low24h).toLocaleString()}</span>
            <span>Vol: {parseFloat(priceData.volume24h).toLocaleString()}</span>
          </div>
        )}
      </div>
      <div ref={chartContainerRef} className="flex-1 w-full min-h-0" />
    </div>
  );
}
