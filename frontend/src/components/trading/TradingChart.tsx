'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type CandlestickData, type Time } from 'lightweight-charts';
import { usePriceStore } from '../../store/trading';
import type { TradingPair } from '@/types/shared';

interface Props {
  pair: TradingPair;
}

export function TradingChart({ pair }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const candleDataRef = useRef<CandlestickData[]>([]);
  const currentCandleRef = useRef<CandlestickData | null>(null);
  const price = usePriceStore((s) => s.prices[pair]);
  const currentPrice = price?.price;

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
      if (chartContainerRef.current) {
        chart.applyOptions({
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
    };
  }, []);

  // Reset candles when pair changes
  useEffect(() => {
    if (seriesRef.current) {
      candleDataRef.current = [];
      currentCandleRef.current = null;
      seriesRef.current.setData([]);
    }
  }, [pair]);

  // Build candles from price ticks
  useEffect(() => {
    if (!currentPrice || !seriesRef.current) return;

    const priceVal = parseFloat(currentPrice);
    if (!priceVal) return;

    const now = Math.floor(Date.now() / 1000) as Time;
    const candleTime = (Math.floor(Number(now) / 60) * 60) as Time; // 1-minute candles

    const series = seriesRef.current;
    let current = currentCandleRef.current;

    if (!current || current.time !== candleTime) {
      // Close previous candle
      if (current) {
        candleDataRef.current.push(current);
        if (candleDataRef.current.length > 300) {
          candleDataRef.current = candleDataRef.current.slice(-300);
        }
        series.setData(candleDataRef.current);
      }

      // Start new candle
      current = {
        time: candleTime,
        open: priceVal,
        high: priceVal,
        low: priceVal,
        close: priceVal,
      };
      currentCandleRef.current = current;
    } else {
      // Update current candle
      if (priceVal > current.high) current.high = priceVal;
      if (priceVal < current.low) current.low = priceVal;
      current.close = priceVal;
    }

    // Update the series with all data + current candle
    series.setData([...candleDataRef.current, current]);
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
        {price && (
          <div className="flex items-center gap-3 text-[10px] text-[#848E9C]">
            <span>24h H: {parseFloat(price.high24h).toLocaleString()}</span>
            <span>24h L: {parseFloat(price.low24h).toLocaleString()}</span>
            <span>Vol: {parseFloat(price.volume24h).toLocaleString()}</span>
          </div>
        )}
      </div>
      <div ref={chartContainerRef} className="flex-1 w-full" />
    </div>
  );
}
