'use client';

import React, { useEffect, useState } from 'react';
import { getAdminStats } from '../lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    getAdminStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Users" value={stats?.users?.data?.length ?? '—'} color="blue" />
        <StatCard label="Open Orders" value={stats?.orders?.data?.length ?? '—'} color="green" />
        <StatCard label="Recent Trades" value={stats?.trades?.data?.length ?? '—'} color="yellow" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Recent Users</h3>
          <div className="space-y-2">
            {(stats?.users?.data || []).slice(0, 5).map((user: any) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-[#1a1d27] border border-[#2d3347] rounded-lg">
                <div>
                  <p className="text-sm">{user.email}</p>
                  <p className="text-xs text-gray-500">{user.name}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  user.kyc_status === 'approved' ? 'bg-green-900/30 text-green-400' :
                  user.kyc_status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  {user.kyc_status}
                </span>
              </div>
            ))}
            {(!stats?.users?.data || stats.users.data.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">No users yet</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Recent Trades</h3>
          <div className="space-y-2">
            {(stats?.trades?.data || []).slice(0, 8).map((trade: any) => (
              <div key={trade.id} className="flex items-center justify-between p-3 bg-[#1a1d27] border border-[#2d3347] rounded-lg">
                <span className="font-mono text-sm">{trade.pair}</span>
                <span className={`text-sm ${trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                  {parseFloat(trade.price).toFixed(4)}
                </span>
                <span className="text-sm text-gray-400">{parseFloat(trade.amount).toFixed(4)}</span>
                <span className="text-xs text-gray-500">
                  {new Date(trade.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {(!stats?.trades?.data || stats.trades.data.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">No trades yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'border-blue-800 bg-blue-900/20',
    green: 'border-green-800 bg-green-900/20',
    yellow: 'border-yellow-800 bg-yellow-900/20',
  };
  return (
    <div className={`p-4 border rounded-xl ${colors[color]}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
