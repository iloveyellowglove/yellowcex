'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Header } from '../../components/layout/Header';
import { apiGet, apiDelete } from '../../lib/api';
import { ArrowUpDown, Search } from 'lucide-react';
import type { Order, OrderStatus } from '@/types/shared';

type SortField = 'created_at' | 'pair' | 'side' | 'type' | 'price' | 'amount' | 'status';
type SortDir = 'asc' | 'desc';

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fetching, setFetching] = useState(true);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredOrders = useMemo(() => {
    let result = [...orders];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((o) => o.pair.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortField === 'price') cmp = parseFloat(a.price) - parseFloat(b.price);
      else if (sortField === 'amount') cmp = parseFloat(a.amount) - parseFloat(b.amount);
      else cmp = String(a[sortField] || '').localeCompare(String(b[sortField] || ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [orders, search, sortField, sortDir]);

  if (!user) return null;

  const tabs: { label: string; value: string; count?: number }[] = [
    { label: 'All Orders', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'Partial', value: 'partial' },
    { label: 'Filled', value: 'filled' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const SortIcon = ({ field }: { field: SortField }) => (
    <button
      onClick={() => handleSort(field)}
      className="inline-flex items-center hover:text-white transition-colors"
    >
      <ArrowUpDown size={12} className={sortField === field ? 'text-brand' : ''} />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col">
      <Header />
      <div className="max-w-6xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Orders</h1>
            <p className="text-sm text-[#848E9C] mt-1">Track and manage your trading orders</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#474D57]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by pair..."
              className="pl-8 pr-3 py-1.5 bg-[#1E2329] border border-[#2B3139] rounded-lg text-sm text-white placeholder-[#474D57] focus:outline-none focus:border-brand w-48"
            />
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 mb-4 p-1 bg-[#1E2329] rounded-lg inline-flex flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === tab.value
                  ? 'bg-brand text-black'
                  : 'text-[#848E9C] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-lg font-semibold text-white mb-2">No orders found</h3>
            <p className="text-sm text-[#848E9C]">
              <a href="/trade" className="text-brand hover:underline">Start trading</a> to see your orders here.
            </p>
          </div>
        ) : (
          <div className="bg-[#1E2329] border border-[#2B3139] rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-8 gap-3 px-4 py-2.5 text-[10px] text-[#474D57] uppercase tracking-wider bg-[#0B0E11]/50 border-b border-[#2B3139]">
              <span className="flex items-center gap-1">Pair <SortIcon field="pair" /></span>
              <span className="flex items-center gap-1">Side <SortIcon field="side" /></span>
              <span className="flex items-center gap-1">Type <SortIcon field="type" /></span>
              <span className="flex items-center gap-1 text-right">Price <SortIcon field="price" /></span>
              <span className="text-right">Amount</span>
              <span className="text-right">Filled</span>
              <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
              <span className="text-right">Action</span>
            </div>

            {/* Table body */}
            <div className="divide-y divide-[#2B3139]">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="grid grid-cols-8 gap-3 px-4 py-3 text-sm items-center hover:bg-[#2B3139]/50 transition-colors"
                >
                  <span className="font-mono font-medium text-white text-xs">{order.pair}</span>
                  <span className={`text-xs font-semibold ${order.side === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {order.side.toUpperCase()}
                  </span>
                  <span className="text-xs text-[#848E9C]">{order.type}</span>
                  <span className="font-mono text-right text-xs text-white">
                    {parseFloat(order.price).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </span>
                  <span className="font-mono text-right text-xs text-[#EAECEF]">
                    {parseFloat(order.amount).toFixed(4)}
                  </span>
                  <span className="font-mono text-right text-xs text-[#848E9C]">
                    {parseFloat(order.filled).toFixed(4)}
                  </span>
                  <span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        order.status === 'filled'
                          ? 'bg-[#0ECB81]/10 text-[#0ECB81]'
                          : order.status === 'open'
                          ? 'bg-[#3B82F6]/10 text-[#3B82F6]'
                          : order.status === 'partial'
                          ? 'bg-[#F0B90B]/10 text-[#F0B90B]'
                          : 'bg-[#F6465D]/10 text-[#F6465D]'
                      }`}
                    >
                      {order.status}
                    </span>
                  </span>
                  <span className="text-right">
                    {(order.status === 'open' || order.status === 'partial') && (
                      <button
                        onClick={() => handleCancel(order.id)}
                        className="text-xs text-[#F6465D] hover:underline font-medium"
                      >
                        Cancel
                      </button>
                    )}
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
