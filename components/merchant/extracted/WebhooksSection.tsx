'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function WebhooksSection({ merchantAddress }: { merchantAddress: string }) {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>(['payment.completed']);
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shownSecret, setShownSecret] = useState<string | null>(null);

  const allEventTypes = [
    'payment.completed', 'payment.failed', 'refund.initiated', 'refund.completed',
    'escrow.created', 'escrow.funded', 'escrow.released', 'escrow.disputed',
    'invoice.created', 'invoice.paid', 'invoice.overdue',
    'subscription.created', 'subscription.renewed', 'subscription.cancelled',
    'merchant.suspended', 'merchant.reinstated',
  ];

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/merchant/webhooks', {
          
        });
        if (res.ok) {
          const data = await res.json();
          setEndpoints(data.endpoints || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [merchantAddress]);

  const handleCreate = async () => {
    if (!newUrl || newEvents.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/merchant/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl, events: newEvents, description: newDescription }),
      });
      if (res.ok) {
        const data = await res.json();
        setShownSecret(data.secret);
        setEndpoints(prev => [data.endpoint, ...prev]);
        setNewUrl('');
        setNewDescription('');
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch('/api/merchant/webhooks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setEndpoints(prev => prev.filter(e => e.id !== id));
      }
    } catch { /* ignore */ }
  };

  const toggleEvent = (event: string) => {
    setNewEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  return (
    <div className="space-y-6">
      {/* Create Webhook */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Add Webhook Endpoint
        </h2>
        <div className="space-y-4">
          <MobileInput
            label="Endpoint URL (HTTPS)"
            placeholder="https://your-server.com/webhook"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <MobileInput
            label="Description"
            placeholder="Order fulfillment webhook"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Events</p>
            <div className="flex flex-wrap gap-2">
              {allEventTypes.map(event => (
                <button
                  key={event}
                  onClick={() => toggleEvent(event)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    newEvents.includes(event)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>
          <MobileButton onClick={handleCreate} disabled={submitting || !newUrl}>
            {submitting ? 'Creating...' : 'Create Endpoint'}
          </MobileButton>
        </div>
      </div>

      {/* Shown Secret (one-time) */}
      {shownSecret && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-300 dark:border-yellow-700">
          <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300 mb-2">
            Webhook Signing Secret (shown once — copy now!)
          </p>
          <code className="text-sm font-mono break-all text-yellow-900 dark:text-yellow-200">
            {shownSecret}
          </code>
          <div className="mt-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(shownSecret);
                setShownSecret(null);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Copy & Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Endpoints List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Webhook Endpoints ({endpoints.length})
        </h2>
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {!loading && endpoints.length === 0 && (
          <p className="text-sm text-gray-500">No webhook endpoints configured.</p>
        )}
        <div className="space-y-3">
          {endpoints.map(ep => (
            <div key={ep.id} className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{ep.url}</p>
                  {ep.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{ep.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ep.events.map(e => (
                      <span key={e} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                        {e}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Status: {ep.status} · Failures: {ep.failure_count}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(ep.id)}
                  className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
