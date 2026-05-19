'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Header } from '../../components/layout/Header';
import { apiGet, apiDelete } from '../../lib/api';
import type { Order, OrderStatus } from '@/types/shared';

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fetching, setFetching] = useState(true);

  const fetchOrders = async () => {
    const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
    const res = await apiGet<Order[]>(`/api/orders${query}`);
    if (res.success && res.data) setOrders(res.data as Order[]);
    setFetching(false);
  };

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) fetchOrders();
  }, [user, loading, router, statusFilter]);

  const handleCancel = async (orderId: string) => {
    const res = await apiDelete(`/api/orders/${orderId}`);
    if (res.success) fetchOrders();
  };

  if (!user) return null;

  const tabs: { label: string; value: string }[] = [
    { label: 'All', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'Filled', value: 'filled' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <div className="min-h-screen bg-[hsl(220,13%,7%)] flex flex-col">
      <Header />
      <div className="max-w-5xl mx-auto w-full px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Orders</h1>

        <div className="flex gap-2 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                statusFilter === tab.value
                  ? 'bg-brand text-black font-medium'
                  : 'bg-[hsl(220,15%,11%)] text-[hsl(220,10%,70%)] border border-[hsl(220,13%,18%)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {fetching ? (
          <div className="text-center py-12 text-[hsl(220,10%,50%)]">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-[hsl(220,10%,50%)]">
            No orders found. <a href="/trade" className="text-brand hover:underline">Start trading</a>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-7 gap-2 px-3 py-2 text-xs text-[hsl(220,10%,50%)] uppercase tracking-wider">
              <span>Pair</span>
              <span>Side</span>
              <span>Type</span>
              <span>Price</span>
              <span>Amount/Filled</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {orders.map((order) => (
              <div
                key={order.id}
                className="grid grid-cols-7 gap-2 px-3 py-3 bg-[hsl(220,15%,11%)] border border-[hsl(220,13%,18%)] rounded-lg text-sm items-center"
              >
                <span className="font-mono">{order.pair}</span>
                <span className={order.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                  {order.side.toUpperCase()}
                </span>
                <span className="text-[hsl(220,10%,60%)]">{order.type}</span>
                <span className="font-mono">{parseFloat(order.price).toFixed(2)}</span>
                <span className="font-mono text-xs">
                  {parseFloat(order.filled)}/{parseFloat(order.amount)}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  order.status === 'filled' ? 'bg-green-900/30 text-green-400' :
                  order.status === 'open' ? 'bg-blue-900/30 text-blue-400' :
                  order.status === 'partial' ? 'bg-yellow-900/30 text-yellow-400' :
                  'bg-red-900/30 text-red-400'
                }`}>
                  {order.status}
                </span>
                <span>
                  {(order.status === 'open' || order.status === 'partial') && (
                    <button
                      onClick={() => handleCancel(order.id)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
