'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 border-b border-[hsl(220,13%,18%)] bg-[hsl(220,13%,11%)] flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-brand tracking-tight">YellowCEX</span>
        </Link>
        <nav className="hidden md:flex items-center gap-4">
          <Link href="/trade" className="text-sm text-[hsl(220,10%,60%)] hover:text-white transition-colors">
            Trade
          </Link>
          <Link href="/wallets" className="text-sm text-[hsl(220,10%,60%)] hover:text-white transition-colors">
            Wallets
          </Link>
          <Link href="/orders" className="text-sm text-[hsl(220,10%,60%)] hover:text-white transition-colors">
            Orders
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Link href="/profile" className="text-sm text-[hsl(220,10%,60%)] hover:text-white transition-colors">
              {user.email}
            </Link>
            {user.kyc_status !== 'approved' && (
              <Link
                href="/kyc"
                className={`text-xs px-2 py-0.5 rounded ${
                  user.kyc_status === 'pending'
                    ? 'bg-yellow-900/30 text-yellow-400'
                    : 'bg-red-900/30 text-red-400'
                }`}
              >
                KYC: {user.kyc_status}
              </Link>
            )}
            <button
              onClick={logout}
              className="text-xs text-[hsl(220,10%,60%)] hover:text-white transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm text-[hsl(220,10%,60%)] hover:text-white transition-colors">
              Login
            </Link>
            <Link
              href="/register"
              className="text-sm px-3 py-1 bg-brand text-black font-medium rounded hover:opacity-90 transition-opacity"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
