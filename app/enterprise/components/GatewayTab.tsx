'use client';

import { useState } from 'react';
import { FileText, Globe } from 'lucide-react';

export function GatewayTab({ isConnected }: { isConnected: boolean }) {
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [metadata, setMetadata] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const recentOrders: { id: string; amount: string; status: string; time: string }[] = [];

  const handleCreateOrder = async () => {
    if (!orderId || !amount) return;
    setIsCreating(true);
    try {
      const response = await fetch('/api/enterprise/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount, metadata }),
      });
      if (!response.ok) {
        console.warn('[Enterprise] Order API returned', response.status);
        return;
      }
      setOrderId('');
      setAmount('');
      setMetadata('');
    } catch {
      console.warn('[Enterprise] Order API not available');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Gateway Overview */}
      <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Globe className="w-12 h-12 text-cyan-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Enterprise Gateway</h2>
            <p className="text-zinc-400">High-volume payment processing with batch settlements</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-cyan-400">247</div>
            <div className="text-sm text-zinc-400">Orders Processed</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-zinc-100">1.2M</div>
            <div className="text-sm text-zinc-400">VFIDE Volume</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">98.5%</div>
            <div className="text-sm text-zinc-400">Settlement Rate</div>
          </div>
        </div>
      </div>

      {/* Create Order */}
      {isConnected ? (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-zinc-100 mb-6">Create Order</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Order ID</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter unique order ID"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Amount (VFIDE)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-sm text-zinc-400 mb-2 block">Metadata (optional)</label>
            <input
              type="text"
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              placeholder="Order reference, customer ID, etc."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <button 
            onClick={handleCreateOrder}
            disabled={isCreating || !orderId || !amount}
            className="w-full bg-cyan-400 hover:bg-cyan-500 text-zinc-950 font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      ) : (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 sm:p-6 md:p-8 text-center">
          <p className="text-zinc-400">Connect wallet to create orders</p>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Recent Orders</h3>
        <div className="space-y-3">
          {recentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg">
              <div className="flex items-center gap-4">
                <FileText className="text-zinc-400" size={20} />
                <div>
                  <div className="text-zinc-100 font-bold">{order.id}</div>
                  <div className="text-xs text-zinc-400">{order.time}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-cyan-400 font-bold">{order.amount}</div>
                <div className={`text-xs ${order.status === 'settled' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {order.status === 'settled' ? 'Settled' : 'Pending'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
