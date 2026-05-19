import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'YellowCEX Admin',
  description: 'YellowCEX Exchange Administration Panel',
};

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/users', label: 'Users' },
  { href: '/kyc', label: 'KYC Review' },
  { href: '/orders', label: 'Orders' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex">
          <aside className="w-56 bg-[#1a1d27] border-r border-[#2d3347] flex-shrink-0 p-4">
            <div className="mb-8">
              <h1 className="text-lg font-bold text-[#e6b800]">YellowCEX</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#2d3347] rounded-lg transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
