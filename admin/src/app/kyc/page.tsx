'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function KycReviewPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = () => {
    api.get<any[]>('/api/admin/kyc').then((res) => {
      if (res.success && res.data) setDocuments(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    const notes = status === 'rejected' ? prompt('Rejection reason:') : null;
    const res = await api.put(`/api/admin/kyc/${id}`, { status, reviewer_notes: notes ?? '' });
    if (res.success) fetchDocs();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">KYC Review</h2>
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 bg-[#1a1d27] border border-[#2d3347] rounded-xl">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-mono">{doc.user_id}</p>
                  <p className="text-xs text-gray-400 capitalize">{doc.document_type.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-500">{new Date(doc.submitted_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  doc.status === 'approved' ? 'bg-green-900/30 text-green-400' :
                  doc.status === 'rejected' ? 'bg-red-900/30 text-red-400' :
                  'bg-yellow-900/30 text-yellow-400'
                }`}>
                  {doc.status}
                </span>
              </div>

              {doc.image_url && (
                <a
                  href={doc.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mb-3 text-xs text-blue-400 hover:underline"
                >
                  View Document →
                </a>
              )}

              {doc.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview(doc.id, 'approved')}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:opacity-90"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview(doc.id, 'rejected')}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:opacity-90"
                  >
                    Reject
                  </button>
                </div>
              )}

              {doc.reviewer_notes && (
                <p className="mt-2 text-xs text-gray-500">Notes: {doc.reviewer_notes}</p>
              )}
            </div>
          ))}
          {documents.length === 0 && (
            <p className="text-gray-500 text-center py-8">No KYC documents pending review</p>
          )}
        </div>
      )}
    </div>
  );
}
