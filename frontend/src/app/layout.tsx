import type { Metadata } from 'next';
import { AuthProvider } from '../lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'YellowCEX - Cryptocurrency Exchange',
  description: 'Trade Bitcoin, Ethereum, Solana and more on YellowCEX',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
