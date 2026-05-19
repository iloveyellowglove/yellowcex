'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Header } from '../../components/layout/Header';
import { apiPut } from '../../lib/api';
import { Shield, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { User } from '@/types/shared';

export default function ProfilePage() {
  const { user, loading, updateUser } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) setName(user.name ?? '');
  }, [user, loading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiPut<User>('/api/auth/profile', { name });
      if (res.success && res.data) {
        updateUser(res.data);
        setMessage({ type: 'success', text: 'Profile updated' });
      } else {
        setMessage({ type: 'error', text: res.error ?? 'Update failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const kycStatusConfig = {
    approved: { icon: CheckCircle, color: 'text-[#0ECB81]', bg: 'bg-[#0ECB81]/10', border: 'border-[#0ECB81]/20', label: 'Verified' },
    pending: { icon: Clock, color: 'text-[#F0B90B]', bg: 'bg-[#F0B90B]/10', border: 'border-[#F0B90B]/20', label: 'Pending Review' },
    rejected: { icon: XCircle, color: 'text-[#F6465D]', bg: 'bg-[#F6465D]/10', border: 'border-[#F6465D]/20', label: 'Rejected' },
    none: { icon: Shield, color: 'text-[#848E9C]', bg: 'bg-[#1E2329]', border: 'border-[#2B3139]', label: 'Not Verified' },
  };
  const kycInfo = kycStatusConfig[user.kyc_status] || kycStatusConfig.none;
  const KycIcon = kycInfo.icon;

  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col">
      <Header />
      <div className="max-w-2xl mx-auto w-full px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Profile</h1>

        {/* Profile card */}
        <div className="bg-[#1E2329] border border-[#2B3139] rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center">
              <span className="text-brand text-xl font-bold">
                {(user.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{user.name || 'User'}</h2>
              <p className="text-sm text-[#848E9C]">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0B0E11] rounded-lg p-4">
              <span className="text-[10px] text-[#474D57] uppercase tracking-wider">Member Since</span>
              <p className="text-sm text-white mt-1 font-medium">
                {new Date(user.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="bg-[#0B0E11] rounded-lg p-4">
              <span className="text-[10px] text-[#474D57] uppercase tracking-wider">Account ID</span>
              <p className="text-sm text-white mt-1 font-mono truncate">{user.id.slice(0, 12)}...</p>
            </div>
          </div>
        </div>

        {/* KYC Status */}
        <div className={`${kycInfo.bg} border ${kycInfo.border} rounded-2xl p-5 mb-6`}>
          <div className="flex items-center gap-3 mb-3">
            <KycIcon size={20} className={kycInfo.color} />
            <div>
              <h3 className="text-sm font-semibold text-white">Identity Verification</h3>
              <p className={`text-sm ${kycInfo.color}`}>{kycInfo.label}</p>
            </div>
          </div>
          {user.kyc_status === 'none' && (
            <p className="text-xs text-[#848E9C]">
              Verify your identity to unlock higher withdrawal limits and full platform features.
            </p>
          )}
          {user.kyc_status === 'rejected' && (
            <p className="text-xs text-[#F6465D]">
              Your KYC submission was rejected. Please resubmit with valid documents.
            </p>
          )}
        </div>

        {/* Edit profile */}
        <div className="bg-[#1E2329] border border-[#2B3139] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Edit Profile</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[#EAECEF]">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0B0E11] border border-[#2B3139] rounded-lg text-sm text-white placeholder-[#474D57] focus:outline-none focus:border-brand transition-colors"
                placeholder="Your display name"
              />
            </div>
            {message && (
              <p
                className={`text-sm ${
                  message.type === 'success' ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                }`}
              >
                {message.text}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-brand text-black font-medium rounded-lg text-sm hover:bg-[#F8D33E] disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
