'use client';

import { Footer } from '@/components/layout/Footer';
import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useEscrow } from '@/lib/escrow/useEscrow';
import { validateAddress } from '@/lib/validation';
import { toast } from '@/lib/toast';

type TabId = 'active' | 'completed' | 'disputes';

const TAB_LABELS: Record<TabId, string> = { active: 'Active', completed: 'Completed', disputes: 'Disputes' };
const TAB_IDS: TabId[] = ['active', 'completed', 'disputes'];

export default function EscrowPage() {
  const { isConnected } = useAccount();
  const {
    activeEscrows = [],
    completedEscrows = [],
    disputedEscrows = [],
    createEscrow,
    formatEscrowAmount,
    getTimeRemaining,
    refresh,
  } = useEscrow();

  const [activeTab, setActiveTab] = useState<TabId>('active');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [merchantAddress, setMerchantAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [orderId, setOrderId] = useState('');

  const escrows = useMemo(() => {
    if (activeTab === 'completed') return completedEscrows;
    if (activeTab === 'disputes') return disputedEscrows;
    return activeEscrows;
  }, [activeEscrows, activeTab, completedEscrows, disputedEscrows]);

  const handleCreate = async () => {
    const validation = validateAddress(merchantAddress);
    if (!validation.valid) {
      toast.error(validation.error || 'Address format is invalid');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    try {
      await createEscrow(merchantAddress as `0x${string}`, amount, orderId || 'ORD-2026-0001');
      toast.success('Escrow created successfully');
      setShowCreateForm(false);
      setMerchantAddress('');
      setAmount('');
      setOrderId('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create escrow');
    }
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Buyer Protection</h1>
            <p className="text-white/60">Secure conditional payments with release, refund, and dispute tooling.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              aria-label="Create new escrow"
              disabled={!isConnected}
              onClick={() => {
                if (isConnected) {
                  setShowCreateForm(true);
                }
              }}
              className="px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create new escrow
            </button>
            <button
              type="button"
              onClick={() => refresh()}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white font-semibold"
            >
              Refresh
            </button>
          </div>

          {!isConnected && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-gray-100">
              Connect your wallet to view and manage your escrows.
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-2">
            {TAB_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}
              >
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          {showCreateForm && (
            <div className="rounded-2xl border border-white/10 bg-white/3 p-6 space-y-4">
              <h2 className="text-xl font-bold text-white">Create Escrow</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={merchantAddress}
                  onChange={(event) => setMerchantAddress(event.target.value)}
                  placeholder="0x..."
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-gray-500"
                />
                <input
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="1000"
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-gray-500"
                />
                <input
                  type="text"
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value)}
                  placeholder="ORD-2026-0001"
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-gray-500"
                />
              </div>
              <button
                type="button"
                onClick={handleCreate}
                className="px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 font-semibold"
              >
                Create Escrow
              </button>
            </div>
          )}

          {escrows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 p-10 text-center">
              <h2 className="text-2xl font-bold text-white">No Escrows Found</h2>
              <p className="text-gray-400 mt-2">New escrow orders will appear here once they are created.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {escrows.map((escrow) => (
                <div key={String(escrow.id)} className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-white font-semibold">{escrow.orderId || `Escrow #${String(escrow.id)}`}</div>
                    <div className="text-sm text-gray-400">Merchant {escrow.merchant}</div>
                  </div>
                  <div className="text-right text-sm text-gray-300">
                    <div>{formatEscrowAmount(escrow.amount)} VFIDE</div>
                    <div>{getTimeRemaining(escrow.releaseTime)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
