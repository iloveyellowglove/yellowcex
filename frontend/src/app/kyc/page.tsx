'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Header } from '../../components/layout/Header';
import { apiUpload, apiGet } from '../../lib/api';
import type { KycDocument } from '@yellowcex/shared';

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
    <div className="min-h-screen bg-[hsl(220,13%,7%)] flex flex-col">
      <Header />
      <div className="max-w-2xl mx-auto w-full px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">KYC Verification</h1>
        <p className="text-sm text-[hsl(220,10%,60%)] mb-6">
          Upload a government-issued ID to verify your identity. Required for withdrawals.
        </p>

        {user.kyc_status === 'approved' ? (
          <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg text-green-400 text-sm">
            Your identity has been verified.
          </div>
        ) : (
          <form onSubmit={handleUpload} className="bg-[hsl(220,15%,11%)] border border-[hsl(220,13%,18%)] rounded-xl p-6 space-y-4">
            {error && <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-400">{error}</div>}

            <div>
              <label className="block text-sm font-medium mb-1 text-[hsl(220,10%,70%)]">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,18%)] rounded-lg text-white focus:outline-none focus:border-brand"
              >
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver&apos;s License</option>
                <option value="national_id">National ID Card</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-[hsl(220,10%,70%)]">Upload ID Image</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-[hsl(220,10%,60%)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-[hsl(220,13%,18%)] file:text-white hover:file:bg-[hsl(220,13%,22%)]"
                required
              />
              <p className="text-xs text-[hsl(220,10%,50%)] mt-1">JPEG, PNG, WebP, or PDF. Max 5MB.</p>
            </div>

            <button
              type="submit"
              disabled={uploading || !file}
              className="px-6 py-2 bg-brand text-black font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Submit for Verification'}
            </button>
          </form>
        )}

        {documents.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Submission History</h2>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-[hsl(220,15%,11%)] border border-[hsl(220,13%,18%)] rounded-lg"
                >
                  <div>
                    <span className="text-sm font-medium capitalize">{doc.document_type.replace('_', ' ')}</span>
                    <span className="text-xs text-[hsl(220,10%,50%)] ml-3">
                      {new Date(doc.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    doc.status === 'approved' ? 'bg-green-900/30 text-green-400' :
                    doc.status === 'rejected' ? 'bg-red-900/30 text-red-400' :
                    'bg-yellow-900/30 text-yellow-400'
                  }`}>
                    {doc.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
