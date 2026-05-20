'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import {
  ChevronDown,
  User,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Wallet,
  FileText,
  Shield,
  Layers,
  Users,
} from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const navLinks = [
    { href: '/trade', label: 'Trade', icon: TrendingUp },
    { href: '/invest', label: 'Invest', icon: Layers },
    { href: '/wallets', label: 'Wallets', icon: Wallet },
    { href: '/orders', label: 'Orders', icon: FileText },
    { href: '/referral', label: 'Referral', icon: Users },
  ];

  return (
    <header className="h-14 bg-[#0B0E11] border-b border-[#2B3139] flex items-center justify-between px-4 shrink-0 z-50">
      {/* Left section */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">Y</span>
          </div>
          <span className="text-lg font-bold text-white tracking-tight hidden sm:block">
            YellowCEX
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  isActive
                    ? 'text-brand bg-[#1E2329]'
                    : 'text-[#848E9C] hover:text-white hover:bg-[#1E2329]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#1E2329] transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center">
                <span className="text-brand text-xs font-semibold">
                  {(user.email || 'U')[0].toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-[#EAECEF] hidden sm:block max-w-[120px] truncate">
                {user.email}
              </span>
              {user.kyc_status !== 'approved' && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    user.kyc_status === 'pending'
                      ? 'bg-[#F0B90B]/10 text-[#F0B90B]'
                      : 'bg-[#F6465D]/10 text-[#F6465D]'
                  }`}
                >
                  KYC
                </span>
              )}
              <ChevronDown
                size={14}
                className={`text-[#848E9C] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-[#1E2329] border border-[#2B3139] rounded-lg shadow-2xl animate-slide-down overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2B3139]">
                  <p className="text-sm text-white font-medium truncate">{user.email}</p>
                  <p className="text-xs text-[#848E9C] mt-0.5">
                    KYC: <span className={user.kyc_status === 'approved' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>{user.kyc_status}</span>
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#EAECEF] hover:bg-[#2B3139] transition-colors"
                  >
                    <User size={15} className="text-[#848E9C]" />
                    Profile
                  </Link>
                  {user.kyc_status === 'none' && (
                    <Link
                      href="/kyc"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#EAECEF] hover:bg-[#2B3139] transition-colors"
                    >
                      <Shield size={15} className="text-[#848E9C]" />
                      Verify Identity
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#F6465D] hover:bg-[#2B3139] transition-colors w-full"
                  >
                    <LogOut size={15} />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-1.5 text-sm text-[#EAECEF] hover:text-white rounded-md hover:bg-[#1E2329] transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="px-4 py-1.5 text-sm font-medium bg-brand text-black rounded-md hover:bg-[#F8D33E] transition-colors"
            >
              Register
            </Link>
          </div>
        )}

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-1.5 rounded-md hover:bg-[#1E2329] transition-colors"
        >
          {mobileOpen ? <X size={20} className="text-[#EAECEF]" /> : <Menu size={20} className="text-[#EAECEF]" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="absolute top-14 left-0 right-0 bg-[#1E2329] border-b border-[#2B3139] p-4 md:hidden animate-slide-down z-50">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'text-brand bg-[#0B0E11]'
                      : 'text-[#EAECEF] hover:bg-[#2B3139]'
                  }`}
                >
                  <Icon size={16} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
