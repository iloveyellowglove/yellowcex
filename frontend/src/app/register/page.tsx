'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      router.push('/trade');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(220,13%,7%)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-brand">YellowCEX</Link>
          <h1 className="text-xl font-semibold mt-4">Create your account</h1>
          <p className="text-sm text-[hsl(220,10%,60%)] mt-1">Start trading in minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-[hsl(220,10%,70%)]">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[hsl(220,15%,11%)] border border-[hsl(220,13%,18%)] rounded-lg text-white placeholder-[hsl(220,10%,40%)] focus:outline-none focus:border-brand"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[hsl(220,10%,70%)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[hsl(220,15%,11%)] border border-[hsl(220,13%,18%)] rounded-lg text-white placeholder-[hsl(220,10%,40%)] focus:outline-none focus:border-brand"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[hsl(220,10%,70%)]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[hsl(220,15%,11%)] border border-[hsl(220,13%,18%)] rounded-lg text-white placeholder-[hsl(220,10%,40%)] focus:outline-none focus:border-brand"
              placeholder="Min. 8 characters"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand text-black font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[hsl(220,10%,60%)]">
          Already have an account?{' '}
          <Link href="/login" className="text-brand hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
