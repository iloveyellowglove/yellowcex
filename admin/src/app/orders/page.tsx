'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any[]>('/api/admin/orders').then((res) => {
      if (res.success && res.data) setOrders(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">All Orders</h2>
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="bg-[#1a1d27] border border-[#2d3347] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2d3347] text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Pair</th>
                <th className="text-left px-4 py-3">Side</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Price</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-[#2d3347]/50 hover:bg-[#2d3347]/20">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{order.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{order.user_id?.slice(0, 8)}...</td>
                  <td className="px-4 py-3 font-mono">{order.pair}</td>
                  <td className={`px-4 py-3 ${order.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                    {order.side}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{order.type}</td>
                  <td className="px-4 py-3 text-right font-mono">{parseFloat(order.price).toFixed(4)}</td>
                  <td className="px-4 py-3 text-right font-mono">{parseFloat(order.amount).toFixed(4)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      order.status === 'filled' ? 'bg-green-900/30 text-green-400' :
                      order.status === 'open' ? 'bg-blue-900/30 text-blue-400' :
                      order.status === 'partial' ? 'bg-yellow-900/30 text-yellow-400' :
                      'bg-red-900/30 text-red-400'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">No orders found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
