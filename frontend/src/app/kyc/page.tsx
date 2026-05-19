'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Header } from '../../components/layout/Header';
import { apiUpload, apiGet } from '../../lib/api';
import { Upload, CheckCircle, Clock, XCircle, Shield } from 'lucide-react';
import type { KycDocument } from '@/types/shared';

const docTypeLabels: Record<string, string> = {
  passport: 'Passport',
  drivers_license: "Driver's License",
  national_id: 'National ID Card',
};

export default function KycPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>('passport');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState<KycDocument[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) {
      apiGet<KycDocument[]>('/api/kyc/status').then((res) => {
        if (res.success && res.data) setDocuments(res.data);
      });
    }
  }, [user, loading, router]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);

      const res = await apiUpload<KycDocument>('/api/kyc/submit', formData);
      if (res.success) {
        setFile(null);
        const updated = await apiGet<KycDocument[]>('/api/kyc/status');
        if (updated.success && updated.data) setDocuments(updated.data);
      } else {
        setError(res.error ?? 'Upload failed');
      }
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col">
      <Header />
      <div className="max-w-2xl mx-auto w-full px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">Identity Verification</h1>
        <p className="text-sm text-[#848E9C] mb-6">
          Upload a government-issued ID to verify your identity. Required for withdrawals.
        </p>

        {/* Status banner */}
        {user.kyc_status === 'approved' ? (
          <div className="bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle size={20} className="text-[#0ECB81]" />
            <div>
              <p className="text-sm font-medium text-[#0ECB81]">Identity Verified</p>
              <p className="text-xs text-[#0ECB81]/80">You have full access to all platform features including withdrawals.</p>
            </div>
          </div>
        ) : user.kyc_status === 'pending' ? (
          <div className="bg-[#F0B90B]/10 border border-[#F0B90B]/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Clock size={20} className="text-[#F0B90B]" />
            <div>
              <p className="text-sm font-medium text-[#F0B90B]">Verification Pending</p>
              <p className="text-xs text-[#F0B90B]/80">Your documents are being reviewed. This usually takes 24-48 hours.</p>
            </div>
          </div>
        ) : (
          <div className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-4 mb-6 flex items-center gap-3">
            <Shield size={20} className="text-[#848E9C]" />
            <div>
              <p className="text-sm font-medium text-white">Verification Required</p>
              <p className="text-xs text-[#848E9C]">Submit your ID below to unlock full platform features.</p>
            </div>
          </div>
        )}

        {/* Upload form */}
        {user.kyc_status !== 'approved' && user.kyc_status !== 'pending' && (
          <form onSubmit={handleUpload} className="bg-[#1E2329] border border-[#2B3139] rounded-2xl p-6 space-y-4">
            {error && (
              <div className="p-3 bg-[#F6465D]/10 border border-[#F6465D]/20 rounded-lg text-sm text-[#F6465D]">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5 text-[#EAECEF]">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0B0E11] border border-[#2B3139] rounded-lg text-sm text-white focus:outline-none focus:border-brand transition-colors"
              >
                {Object.entries(docTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-[#EAECEF]">Upload ID Image</label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#2B3139] rounded-xl cursor-pointer hover:border-brand/50 transition-colors bg-[#0B0E11]">
                <div className="flex flex-col items-center justify-center">
                  <Upload size={20} className="text-[#848E9C] mb-1" />
                  <p className="text-xs text-[#848E9C]">
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-[10px] text-[#474D57] mt-1">JPEG, PNG, WebP, or PDF (max 5MB)</p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  required
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full py-2.5 bg-brand text-black font-semibold rounded-lg text-sm hover:bg-[#F8D33E] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {uploading ? 'Uploading...' : 'Submit for Verification'}
            </button>
          </form>
        )}

        {/* Submission history */}
        {documents.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-semibold text-white mb-3">Submission History</h2>
            <div className="space-y-2">
              {documents.map((doc) => {
                const statusConfig = {
                  approved: { icon: CheckCircle, color: 'text-[#0ECB81]', bg: 'bg-[#0ECB81]/10', border: 'border-[#0ECB81]/20' },
                  rejected: { icon: XCircle, color: 'text-[#F6465D]', bg: 'bg-[#F6465D]/10', border: 'border-[#F6465D]/20' },
                  pending: { icon: Clock, color: 'text-[#F0B90B]', bg: 'bg-[#F0B90B]/10', border: 'border-[#F0B90B]/20' },
                };
                const config = statusConfig[doc.status] || statusConfig.pending;
                const StatusIcon = config.icon;

                return (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between p-4 bg-[#1E2329] border ${config.border} rounded-xl`}
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon size={16} className={config.color} />
                      <div>
                        <span className="text-sm font-medium text-white capitalize">
                          {doc.document_type.replace('_', ' ')}
                        </span>
                        <p className="text-[10px] text-[#848E9C]">
                          Submitted {new Date(doc.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${config.bg} ${config.color}`}>
                      {doc.status.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
