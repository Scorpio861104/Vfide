'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function BookingsSection({ merchantAddress }: { merchantAddress: string }) {
  const [bookings, setBookings] = useState<Array<{ id: string; customer_address: string; service_name: string; slot_date: string; start_time: string; end_time: string; status: string; notes: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/merchant/bookings?role=merchant`, )
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.bookings) setBookings(d.bookings); })
      .finally(() => setLoading(false));
  }, [merchantAddress]);

  const updateBookingStatus = async (id: string, status: string) => {
    const res = await fetch('/api/merchant/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: id, status }),
    });
    if (res.ok) setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Loading bookings...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bookings ({bookings.length})</h3>
      <div className="space-y-3">
        {bookings.map(b => (
          <div key={b.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900 dark:text-white text-sm">{b.service_name || 'Appointment'}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                b.status === 'confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                b.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
              }`}>{b.status}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {new Date(b.slot_date).toLocaleDateString()} · {b.start_time} – {b.end_time}
            </p>
            <p className="text-xs text-gray-400 mt-1">{b.customer_address.slice(0, 6)}...{b.customer_address.slice(-4)}</p>
            {b.notes && <p className="text-xs text-gray-500 mt-1 italic">{b.notes}</p>}
            {b.status === 'pending' && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => updateBookingStatus(b.id, 'confirmed')} className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Confirm</button>
                <button onClick={() => updateBookingStatus(b.id, 'cancelled')} className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Cancel</button>
              </div>
            )}
          </div>
        ))}
        {bookings.length === 0 && <p className="text-center text-gray-400 py-4">No bookings yet</p>}
      </div>
    </div>
  );
}
