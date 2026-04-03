'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function SubscriptionsSection({ merchantAddress }: { merchantAddress: string }) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '', description: '', token: 'VFIDE', amount: '',
    interval: 'monthly', trial_days: '0', max_subscribers: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/merchant/subscriptions', );
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, [merchantAddress]);

  const handleCreate = async () => {
    if (!newPlan.name || !newPlan.amount) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/merchant/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlan.name,
          description: newPlan.description || undefined,
          token: newPlan.token,
          amount: Number(newPlan.amount),
          interval: newPlan.interval,
          trial_days: Number(newPlan.trial_days) || 0,
          max_subscribers: newPlan.max_subscribers ? Number(newPlan.max_subscribers) : undefined,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewPlan({ name: '', description: '', token: 'VFIDE', amount: '', interval: 'monthly', trial_days: '0', max_subscribers: '' });
        fetchPlans();
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const handleArchive = async (id: number) => {
    try {
      await fetch('/api/merchant/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'archived' }),
      });
      fetchPlans();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <MobileButton onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Plan'}
        </MobileButton>
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create Subscription Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MobileInput label="Plan Name" placeholder="Pro Plan" value={newPlan.name}
              onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))} />
            <MobileInput label="Amount" type="number" placeholder="10" value={newPlan.amount}
              onChange={(e) => setNewPlan(prev => ({ ...prev, amount: e.target.value }))} />
            <MobileSelect label="Interval"
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
              value={newPlan.interval}
              onChange={(e) => setNewPlan(prev => ({ ...prev, interval: e.target.value }))} />
            <MobileInput label="Trial Days" type="number" value={newPlan.trial_days}
              onChange={(e) => setNewPlan(prev => ({ ...prev, trial_days: e.target.value }))} />
            <MobileInput label="Max Subscribers (empty = unlimited)" type="number" value={newPlan.max_subscribers}
              onChange={(e) => setNewPlan(prev => ({ ...prev, max_subscribers: e.target.value }))} />
            <MobileInput label="Description" value={newPlan.description}
              onChange={(e) => setNewPlan(prev => ({ ...prev, description: e.target.value }))} />
          </div>
          <MobileButton fullWidth onClick={handleCreate} disabled={submitting} className="mt-4">
            {submitting ? 'Creating...' : 'Create Plan'}
          </MobileButton>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Subscription Plans ({plans.length})
        </h2>
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {!loading && plans.length === 0 && (
          <p className="text-sm text-gray-500">No subscription plans yet.</p>
        )}
        <div className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 dark:text-white">{plan.name}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      plan.status === 'active'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-400'
                    }`}>{plan.status}</span>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{plan.description}</p>
                  )}
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {plan.amount} {plan.token} / {plan.interval}
                    {plan.trial_days > 0 && ` · ${plan.trial_days}d trial`}
                    {' · '}{plan.active_subscribers}{plan.max_subscribers ? `/${plan.max_subscribers}` : ''} subscribers
                  </p>
                </div>
                {plan.status === 'active' && (
                  <button
                    onClick={() => handleArchive(plan.id)}
                    className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
