'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type CandlestickData, type Time } from 'lightweight-charts';
import { usePriceStore } from '../../store/trading';
import { PAIR_TO_BINANCE_SYMBOL, type TradingPair } from '@/types/shared';

interface Props {
  pair: TradingPair;
}

interface CandleData {
  t: number; // time in seconds
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
}

function binanceSymbol(pair: TradingPair): string {
  return PAIR_TO_BINANCE_SYMBOL[pair] || pair.replace('/', '').toLowerCase();
}

export function TradingChart({ pair }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const currentCandleRef = useRef<CandlestickData | null>(null);
  const lastPriceRef = useRef<number>(0);
  const pairRef = useRef(pair);
  pairRef.current = pair;

  const priceData = usePriceStore((s) => s.prices[pair]);
  const currentPrice = priceData?.price;

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
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
        fixLeftEdge: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
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

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      currentCandleRef.current = null;
    };
  }, []);

  // Fetch historical klines on pair change
  const fetchAndSetCandles = useCallback(async (fetchPair: TradingPair) => {
    const series = seriesRef.current;
    if (!series) return;

    const symbol = binanceSymbol(fetchPair);
    currentCandleRef.current = null;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/market/candles?symbol=${symbol}&interval=1m&limit=300`
      );
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) return;

      const candles: CandleData[] = json.data;

      const data: CandlestickData[] = candles.map((c) => ({
        time: c.t as Time,
        open: parseFloat(c.o),
        high: parseFloat(c.h),
        low: parseFloat(c.l),
        close: parseFloat(c.c),
      }));

      if (data.length > 0) {
        lastPriceRef.current = parseFloat(candles[candles.length - 1].c);
        series.setData(data);
      }
    } catch {
      // Silently fail — candle data will populate on next successful fetch
    }
  }, []);

  useEffect(() => {
    fetchAndSetCandles(pair);
  }, [pair, fetchAndSetCandles]);

  // Update current candle from live WebSocket price
  useEffect(() => {
    if (!currentPrice || !seriesRef.current) return;

    const priceVal = parseFloat(currentPrice);
    if (!priceVal || priceVal <= 0) return;

    const now = Math.floor(Date.now() / 1000) as Time;
    const candleTime = (Math.floor(Number(now) / 60) * 60) as Time; // 1-min candle boundary

    const series = seriesRef.current;
    let current = currentCandleRef.current;

    if (!current || current.time !== candleTime) {
      // If we have a previous candle, finalize it
      if (current && pairRef.current === pair) {
        // Update the series with closed candle
      }

      // Start new candle — open from previous close
      const open = current ? current.close : lastPriceRef.current || priceVal;

      current = {
        time: candleTime,
        open,
        high: priceVal > open ? priceVal : open,
        low: priceVal < open ? priceVal : open,
        close: priceVal,
      };
      currentCandleRef.current = current;
    } else {
      // Update current candle OHLC
      if (priceVal > current.high) current.high = priceVal;
      if (priceVal < current.low) current.low = priceVal;
      current.close = priceVal;
    }

    lastPriceRef.current = priceVal;

    // Update the chart with the live candle
    series.update(current);
  }, [currentPrice, pair]);

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
      <div ref={chartContainerRef} className="flex-1 w-full" />
    </div>
  );
}
