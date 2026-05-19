'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[hsl(220,13%,7%)] flex flex-col">
      {/* Hero Header */}
      <header className="flex items-center justify-between px-6 h-16 border-b border-[hsl(220,13%,18%)]">
        <span className="text-2xl font-bold text-brand tracking-tight">YellowCEX</span>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/trade" className="text-sm text-white hover:underline">Dashboard</Link>
              <span className="text-sm text-[hsl(220,10%,60%)]">{user.email}</span>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-[hsl(220,10%,60%)] hover:text-white">Login</Link>
              <Link href="/register" className="text-sm px-4 py-1.5 bg-brand text-black font-medium rounded-lg hover:opacity-90">
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
          Trade <span className="text-brand">Crypto</span> with Confidence
        </h1>
        <p className="text-lg text-[hsl(220,10%,60%)] max-w-xl mb-8">
          Lightning-fast order execution, custodial HD wallets, and real-time market data.
          Trade BTC, ETH, SOL, and more with low fees.
        </p>
        <div className="flex gap-4">
          {user ? (
            <Link
              href="/trade"
              className="px-8 py-3 bg-brand text-black font-semibold rounded-lg text-lg hover:opacity-90 transition-opacity"
            >
              Start Trading
            </Link>
          ) : (
            <Link
              href="/register"
              className="px-8 py-3 bg-brand text-black font-semibold rounded-lg text-lg hover:opacity-90 transition-opacity"
            >
              Create Free Account
            </Link>
          )}
          <a
            href="#markets"
            className="px-8 py-3 border border-[hsl(220,13%,22%)] text-white rounded-lg text-lg hover:bg-[hsl(220,13%,12%)] transition-colors"
          >
            View Markets
          </a>
        </div>
      </main>

      {/* Available Pairs */}
      <section id="markets" className="max-w-4xl mx-auto w-full px-6 pb-16">
        <h2 className="text-2xl font-bold mb-6 text-center">Available Trading Pairs</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT',
            'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'MATIC/USDT', 'BTC/ETH',
          ].map((pair) => (
            <Link
              key={pair}
              href={user ? `/trade?pair=${pair}` : '/login'}
              className="flex items-center justify-between px-4 py-3 bg-[hsl(220,15%,11%)] border border-[hsl(220,13%,18%)] rounded-lg hover:border-brand/30 transition-colors"
            >
              <span className="font-mono font-medium">{pair}</span>
              <span className="text-xs text-[hsl(220,10%,60%)]">Trade →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(220,13%,18%)] py-6 text-center text-sm text-[hsl(220,10%,50%)]">
        YellowCEX — Testnet by default. Set NETWORK=mainnet to trade live.
      </footer>
    </div>
  );
}
