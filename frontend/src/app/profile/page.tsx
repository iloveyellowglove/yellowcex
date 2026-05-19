'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Header } from '../../components/layout/Header';
import { apiPut } from '../../lib/api';
import type { User } from '@yellowcex/shared';

export default function ProfilePage() {
  const { user, loading, updateUser } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) setName(user.name ?? '');
  }, [user, loading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await apiPut<User>('/api/auth/profile', { name });
      if (res.success && res.data) {
        updateUser(res.data);
        setMessage('Profile updated');
      } else {
        setMessage(res.error ?? 'Update failed');
      }
    } catch {
      setMessage('Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[hsl(220,13%,7%)] flex flex-col">
      <Header />
      <div className="max-w-2xl mx-auto w-full px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Profile</h1>
        <div className="bg-[hsl(220,15%,11%)] border border-[hsl(220,13%,18%)] rounded-xl p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[hsl(220,10%,50%)] mb-1">Email</label>
              <p className="text-sm">{user.email}</p>
            </div>
            <div>
              <label className="block text-xs text-[hsl(220,10%,50%)] mb-1">KYC Status</label>
              <p className={`text-sm font-medium ${
                user.kyc_status === 'approved' ? 'text-green-400' :
                user.kyc_status === 'pending' ? 'text-yellow-400' :
                'text-red-400'
              }`}>{user.kyc_status.toUpperCase()}</p>
            </div>
            <div>
              <label className="block text-xs text-[hsl(220,10%,50%)] mb-1">Member Since</label>
              <p className="text-sm">{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-[hsl(220,10%,70%)]">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,18%)] rounded-lg text-white focus:outline-none focus:border-brand"
              />
            </div>
            {message && <p className={`text-sm ${message.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-brand text-black font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
