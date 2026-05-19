'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any[]>('/api/admin/users').then((res) => {
      if (res.success && res.data) setUsers(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Users</h2>
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="bg-[#1a1d27] border border-[#2d3347] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2d3347] text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">KYC Status</th>
                <th className="text-left px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-[#2d3347]/50 hover:bg-[#2d3347]/20">
                  <td className="px-4 py-3">
                    <p className="text-sm">{user.email}</p>
                    <p className="text-xs text-gray-500">{user.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      user.kyc_status === 'approved' ? 'bg-green-900/30 text-green-400' :
                      user.kyc_status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                      user.kyc_status === 'rejected' ? 'bg-red-900/30 text-red-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {user.kyc_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-gray-500">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
