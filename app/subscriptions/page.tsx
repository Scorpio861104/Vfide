'use client';

import { Footer } from '@/components/layout/Footer';
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { ZERO_ADDRESS } from '@/lib/constants';
import { safeLocalStorage } from '@/lib/utils';
import { ActiveTab } from './components/ActiveTab';
import { CreateTab } from './components/CreateTab';
import { HistoryTab } from './components/HistoryTab';

type TabId = 'active' | 'create' | 'history';
type BillingInterval = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

type SubscriptionRecord = {
  id: string;
  recipient: string;
  label: string;
  amount: string;
  interval: BillingInterval;
  status: SubscriptionStatus;
  nextPayment: string | null;
  createdAt: string;
  updatedAt: string;
  source: 'local' | 'onchain-ready';
  note: string;
};

const TAB_LABELS: Record<TabId, string> = { active: 'Active', create: 'Create', history: 'History' };
const TAB_IDS: TabId[] = ['active', 'create', 'history'];

function getNextPaymentDate(interval: BillingInterval, from = new Date()) {
  const next = new Date(from);
  switch (interval) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next.toISOString();
}

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('active');
  const { address, isConnected } = useAccount();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [draft, setDraft] = useState<{
    recipient: string;
    amount: string;
    label: string;
    interval: BillingInterval;
  }>({
    recipient: '',
    amount: '50',
    label: 'Recurring payment',
    interval: 'monthly',
  });

  const contractsReady =
    CONTRACT_ADDRESSES.SubscriptionManager !== ZERO_ADDRESS &&
    CONTRACT_ADDRESSES.VFIDEToken !== ZERO_ADDRESS;

  useEffect(() => {
    if (!address) {
      setSubscriptions([]);
      return;
    }

    let cancelled = false;
    const storageKey = `vfide_subscriptions_${address.toLowerCase()}`;

    try {
      const stored = safeLocalStorage.getItem(storageKey);
      if (!stored) {
        setSubscriptions([]);
      } else {
        const parsed = JSON.parse(stored) as SubscriptionRecord[];
        setSubscriptions(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setSubscriptions([]);
    }

    const loadSubscriptions = async () => {
      try {
        const response = await fetch(`/api/subscriptions?address=${address}`, { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const data = await response.json().catch(() => ({ subscriptions: [] }));
        if (!cancelled && Array.isArray(data.subscriptions)) {
          setSubscriptions(data.subscriptions as SubscriptionRecord[]);
        }
      } catch {
        // keep cached subscription data when backend sync is unavailable
      }
    };

    void loadSubscriptions();

    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    if (!address) {
      return;
    }

    safeLocalStorage.setItem(`vfide_subscriptions_${address.toLowerCase()}`, JSON.stringify(subscriptions));
  }, [address, subscriptions]);

  const activeSubscriptions = useMemo(
    () => subscriptions.filter(
      (subscription): subscription is SubscriptionRecord & { status: 'active' | 'paused' } => subscription.status !== 'cancelled'
    ),
    [subscriptions]
  );

  const historyItems = useMemo(
    () => [...subscriptions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [subscriptions]
  );

  const handleCreate = async () => {
    if (!isConnected || !draft.recipient.trim() || !draft.amount.trim()) {
      return;
    }

    const now = new Date();
    let record: SubscriptionRecord = {
      id: `sub-${Date.now()}`,
      recipient: draft.recipient.trim(),
      label: draft.label.trim() || 'Recurring payment',
      amount: draft.amount.trim(),
      interval: draft.interval,
      status: 'active',
      nextPayment: getNextPaymentDate(draft.interval, now),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      source: contractsReady ? 'onchain-ready' : 'local',
      note: contractsReady
        ? 'Contract routes are configured and ready for wallet confirmation.'
        : 'Stored in the VFIDE backend schedule until production contract addresses are restored.',
    };

    if (address) {
      try {
        const response = await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address,
            recipient: record.recipient,
            amount: record.amount,
            label: record.label,
            interval: record.interval,
            contractsReady,
          }),
        });

        const data = await response.json().catch(() => null) as { record?: SubscriptionRecord; subscriptions?: SubscriptionRecord[] } | null;
        if (response.ok && data?.record) {
          record = data.record;
          if (Array.isArray(data.subscriptions)) {
            setSubscriptions(data.subscriptions);
          } else {
            setSubscriptions((current) => [record, ...current]);
          }
        } else {
          setSubscriptions((current) => [record, ...current]);
        }
      } catch {
        setSubscriptions((current) => [record, ...current]);
      }
    } else {
      setSubscriptions((current) => [record, ...current]);
    }

    setDraft({ recipient: '', amount: '50', label: 'Recurring payment', interval: 'monthly' });
    setActiveTab('active');
  };

  const handleTogglePause = async (id: string) => {
    const target = subscriptions.find((subscription) => subscription.id === id);
    const action = target?.status === 'paused' ? 'resume' : 'pause';

    if (address) {
      try {
        const response = await fetch('/api/subscriptions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, id, action }),
        });

        const data = await response.json().catch(() => null) as { subscriptions?: SubscriptionRecord[] } | null;
        if (response.ok && Array.isArray(data?.subscriptions)) {
          setSubscriptions(data.subscriptions);
          return;
        }
      } catch {
        // fall back to the local cache update below
      }
    }

    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id === id
          ? {
              ...subscription,
              status: subscription.status === 'paused' ? 'active' : 'paused',
              updatedAt: new Date().toISOString(),
            }
          : subscription
      )
    );
  };

  const handleCancel = async (id: string) => {
    if (address) {
      try {
        const response = await fetch('/api/subscriptions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, id, action: 'cancel' }),
        });

        const data = await response.json().catch(() => null) as { subscriptions?: SubscriptionRecord[] } | null;
        if (response.ok && Array.isArray(data?.subscriptions)) {
          setSubscriptions(data.subscriptions);
          return;
        }
      } catch {
        // fall back to the local cache update below
      }
    }

    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id === id
          ? {
              ...subscription,
              status: 'cancelled',
              nextPayment: null,
              updatedAt: new Date().toISOString(),
            }
          : subscription
      )
    );
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white mb-2"
          >
            Subscription Manager
          </motion.h1>
          <p className="text-white/60 mb-4">Automate recurring payments from your VFIDE vault.</p>

          <div className="mb-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-gray-200">
            <div className="font-semibold text-cyan-300">
              {contractsReady ? 'On-chain automation ready' : 'Backend scheduling active'}
            </div>
            <p className="mt-1 text-gray-300">
              {contractsReady
                ? 'Subscription contract routes are configured for wallet-backed approvals and recurring execution.'
                : 'Recurring plans are now saved through the VFIDE backend while production contract addresses are being restored.'}
            </p>
          </div>

          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {TAB_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-pressed={activeTab === id}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}
              >
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            <section className={activeTab === 'active' ? 'opacity-100' : 'opacity-80'}>
              <ActiveTab
                isConnected={isConnected}
                subscriptions={activeSubscriptions}
                contractsReady={contractsReady}
                onTogglePause={handleTogglePause}
                onCancel={handleCancel}
              />
            </section>
            <section className={activeTab === 'create' ? 'opacity-100' : 'opacity-80'}>
              <CreateTab
                isConnected={isConnected}
                draft={draft}
                contractsReady={contractsReady}
                onFieldChange={(field, value) => setDraft((current) => ({ ...current, [field]: value }))}
                onCreate={handleCreate}
              />
            </section>
            <section className={activeTab === 'history' ? 'opacity-100' : 'opacity-80'}>
              <HistoryTab history={historyItems} />
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
