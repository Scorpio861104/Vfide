'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function OrdersSection({ merchantAddress }: { merchantAddress: string }) {
  const [orders, setOrders] = useState<Array<{ id: string; order_number: string; status: string; payment_status: string; total_amount: string; customer_address: string; created_at: string; items: Array<{ product_name: string; quantity: number }> }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/merchant/orders?role=merchant`, )
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.orders) setOrders(d.orders); })
      .finally(() => setLoading(false));
  }, [merchantAddress]);

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch('/api/merchant/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: id, status }),
    });
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    processing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
    shipped: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
    delivered: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  };

  const nextStatus: Record<string, string> = {
    pending: 'confirmed',
    confirmed: 'processing',
    processing: 'shipped',
    shipped: 'delivered',
    delivered: 'completed',
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Loading orders...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Orders ({orders.length})</h3>
      <div className="space-y-3">
        {orders.map(order => (
          <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-mono font-medium text-gray-900 dark:text-white text-sm">{order.order_number}</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>{order.status}</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">${parseFloat(order.total_amount).toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              {order.customer_address.slice(0, 6)}...{order.customer_address.slice(-4)} · {new Date(order.created_at).toLocaleDateString()}
            </p>
            <div className="text-xs text-gray-500 mb-2">
              {order.items?.map((item, i) => <span key={i}>{i > 0 && ', '}{item.product_name} ×{item.quantity}</span>)}
            </div>
            {(() => {
              const next = nextStatus[order.status];
              if (!next) return null;
              return (
                <button
                  onClick={() => updateStatus(order.id, next)}
                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Mark {next}
                </button>
              );
            })()}
          </div>
        ))}
        {orders.length === 0 && <p className="text-center text-gray-400 py-4">No orders yet</p>}
      </div>
    </div>
  );
}
