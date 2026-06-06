'use client';

/**
 * MerchantSelfAdminSection — settings card for merchant self-admin operations.
 *
 * Two operations:
 *   1. Update on-chain business info (businessName + category). The wizard
 *      already updates the off-chain MerchantRegistry.metaHash; this form
 *      keeps the on-chain MerchantPortal display fields in sync. Both are
 *      necessary today (Decision 1: parallel systems, no on-chain sync).
 *   2. Voluntarily deregister. Contract preconditions: not suspended, no
 *      pending refunds. We surface a clear two-step confirmation because
 *      this is destructive (merchant has to register again to return).
 *
 * UX notes:
 *   - The update form pre-fills from the current on-chain values via
 *     useIsMerchant(address).
 *   - The deregister button is visually de-emphasized (red ghost) and
 *     requires typing "deregister" to enable, matching the level of
 *     friction the action deserves.
 */

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { m, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, AlertTriangle, CheckCircle2, X, Loader2, Save } from 'lucide-react';
import { useIsMerchant } from '@/lib/vfide-hooks';
import { useMerchantSelfAdmin } from '@/hooks/useMerchantSelfAdmin';

const CATEGORY_OPTIONS = [
  'retail',
  'services',
  'digital_goods',
  'food',
  'health',
  'education',
  'creative',
  'other',
];

export function MerchantSelfAdminSection() {
  const { address } = useAccount();
  const merchantInfo = useIsMerchant(address);
  const { updateMerchantInfo, deregisterMerchant, isWritePending } = useMerchantSelfAdmin();

  // Update form state
  const [editing, setEditing] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('retail');
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Deregister state
  const [showDeregister, setShowDeregister] = useState(false);
  const [deregisterConfirm, setDeregisterConfirm] = useState('');
  const [deregisterError, setDeregisterError] = useState<string | null>(null);
  const [deregisterMessage, setDeregisterMessage] = useState<string | null>(null);

  // Pre-fill from on-chain values when entering edit mode
  useEffect(() => {
    if (editing && merchantInfo) {
      setBusinessName(merchantInfo.businessName || '');
      setCategory(merchantInfo.category || 'retail');
    }
  }, [editing, merchantInfo]);

  const handleSave = async () => {
    setUpdateError(null);
    setUpdateMessage(null);
    if (!businessName.trim()) {
      setUpdateError('Business name cannot be empty.');
      return;
    }
    try {
      await updateMerchantInfo({ businessName: businessName.trim(), category });
      setUpdateMessage('On-chain merchant info updated.');
      setEditing(false);
    } catch (e: any) {
      setUpdateError(e?.shortMessage || e?.message || 'Update failed.');
    }
  };

  const handleDeregister = async () => {
    setDeregisterError(null);
    setDeregisterMessage(null);
    if (deregisterConfirm !== 'deregister') {
      setDeregisterError('Type "deregister" to confirm.');
      return;
    }
    try {
      await deregisterMerchant();
      setDeregisterMessage(
        'Deregistered. You can re-register at any time; your transaction history is preserved.'
      );
      setShowDeregister(false);
      setDeregisterConfirm('');
    } catch (e: any) {
      // Contract reverts surface here. Common cases:
      //   - MERCH_Suspended: account is suspended
      //   - MERCH_InvalidConfig: has pending refunds
      // We let the underlying short message pass through so the merchant
      // sees the actual reason.
      setDeregisterError(e?.shortMessage || e?.message || 'Deregistration failed.');
    }
  };

  // Defensive: this card is for registered merchants only.
  if (!merchantInfo?.isMerchant) return null;

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Pencil className="w-6 h-6 text-purple-400" />
        <div className="font-bold text-lg">Merchant identity</div>
      </div>

      {/* Update business info */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-1">On-chain business info</p>
            {!editing ? (
              <>
                <p className="text-sm font-semibold text-white">
                  {merchantInfo.businessName || '(none set)'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {merchantInfo.category || 'no category'}
                </p>
              </>
            ) : null}
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-accent hover:text-accent inline-flex items-center gap-1 shrink-0"
            >
              <Pencil size={12} />
              Edit
            </button>
          )}
        </div>

        <AnimatePresence>
          {editing && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Business name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  maxLength={64}
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none text-sm"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c} className="bg-zinc-900">
                      {c.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleSave()}
                  disabled={isWritePending}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  {isWritePending ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save size={12} />
                      Save on-chain
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setUpdateError(null);
                  }}
                  disabled={isWritePending}
                  className="px-4 py-2 text-gray-400 hover:text-white disabled:opacity-30 text-sm"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-500">
                These fields are stored on the MerchantPortal contract. Your off-chain profile
                (avatar, bio, links) is managed separately from the{' '}
                <span className="text-accent">Edit profile</span> link.
              </p>
            </m.div>
          )}
        </AnimatePresence>

        {updateError && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            <span>{updateError}</span>
          </div>
        )}
        {updateMessage && !updateError && (
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-start gap-2">
            <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
            <span>{updateMessage}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700/50" />

      {/* Deregister */}
      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Deregister</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Voluntarily stop being a merchant. You can re-register later — your transaction
            volume and history are preserved. Cannot deregister while suspended or while you
            have refunds you haven&apos;t yet completed.
          </p>
        </div>

        {/* Suspended merchants can't deregister — pre-block with a clear notice
            instead of letting them hit a contract revert. */}
        {merchantInfo.isSuspended && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            <span>
              You&apos;re suspended. Deregistration is unavailable until the DAO reinstates the
              account. Reach out via governance channels if you believe the suspension was in
              error.
            </span>
          </div>
        )}

        {!merchantInfo.isSuspended && !showDeregister && (
          <button
            onClick={() => setShowDeregister(true)}
            className="text-xs text-red-300 hover:text-red-200 border border-red-500/30 hover:border-red-500/50 px-3 py-1.5 rounded-md transition-colors inline-flex items-center gap-2"
          >
            <Trash2 size={12} />
            Begin deregistration
          </button>
        )}

        <AnimatePresence>
          {showDeregister && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
                  <div className="text-xs text-red-200">
                    <p className="font-semibold mb-1">Confirm deregistration</p>
                    <p className="leading-relaxed">
                      Type <code className="font-mono bg-red-500/20 px-1 rounded">deregister</code>{' '}
                      below to confirm. This is reversible — you can register again — but it
                      will stop incoming payments to this address immediately.
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  value={deregisterConfirm}
                  onChange={(e) => setDeregisterConfirm(e.target.value)}
                  placeholder="deregister"
                  className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white placeholder:text-gray-600 focus:border-red-500/50 focus:outline-none text-sm font-mono"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => void handleDeregister()}
                    disabled={isWritePending || deregisterConfirm !== 'deregister'}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold flex items-center gap-2"
                  >
                    {isWritePending ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Deregistering…
                      </>
                    ) : (
                      <>
                        <Trash2 size={12} />
                        Deregister
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeregister(false);
                      setDeregisterConfirm('');
                      setDeregisterError(null);
                    }}
                    disabled={isWritePending}
                    className="px-4 py-2 text-gray-400 hover:text-white disabled:opacity-30 text-sm inline-flex items-center gap-1"
                  >
                    <X size={12} />
                    Cancel
                  </button>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {deregisterError && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            <span>{deregisterError}</span>
          </div>
        )}
        {deregisterMessage && !deregisterError && (
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-start gap-2">
            <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
            <span>{deregisterMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
