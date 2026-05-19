'use client';

import React, { useEffect, useRef } from 'react';
import { usePriceStore } from '../../store/trading';
import type { TradingPair } from '@yellowcex/shared';

interface Props {
  pair: TradingPair;
}

export function TradingChart({ pair }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const price = usePriceStore((s) => s.getPrice(pair));

  // Simple canvas chart placeholder
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    // Draw background
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1a1d27';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 6; i++) {
      const y = (h / 2 / 6) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w / 2, y);
      ctx.stroke();
    }

    // Price label
    ctx.fillStyle = '#e6b800';
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillText(pair, 16, 24);

    ctx.fillStyle = '#8b95a8';
    ctx.font = '14px Inter, system-ui, sans-serif';
    const priceText = price && price !== '0' ? `$${parseFloat(price).toFixed(2)}` : 'Loading...';
    ctx.fillText(priceText, 16, 46);

    // Placeholder line
    ctx.strokeStyle = '#1a3a2a';
    ctx.lineWidth = 1;
    const midY = canvas.offsetHeight / 2;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(canvas.offsetWidth, midY + 30);
    ctx.stroke();

  }, [pair, price]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(220,13%,15%)]">
        <span className="text-sm font-medium">{pair}</span>
        <span className={`text-sm font-mono ${parseFloat(price || '0') > 0 ? 'text-green-400' : 'text-[hsl(220,10%,50%)]'}`}>
          {price && price !== '0' ? `$${parseFloat(price).toFixed(2)}` : '—'}
        </span>
      </div>
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}
