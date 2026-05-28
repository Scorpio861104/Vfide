'use client';

import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
/**
 * CreateTab — one-click escrow creation via openAndFundWithIntent.
 *
 * Form fields:
 *   - merchantOwner: address of the registered merchant
 *   - amount: VFIDE amount to escrow (parseUnits to wei)
 *   - notes: optional free-text, hashed into bytes32 metaHash
 *
 * On submit, calls useCommerceEscrow.openAndFundWithIntent which:
 *   1. Builds an EscrowFundIntent
 *   2. Signs it under CardBoundVault's EIP-712 domain (one wallet prompt)
 *   3. Submits the combined open+fund call to CommerceEscrow
 *   4. Returns the new escrow id
 *
 * Pre-flight check: validates the merchant is registered via the existing
 * MerchantRegistry to surface clear errors before signing.
 */

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { isAddress, parseUnits, keccak256, stringToBytes, type Address } from 'viem';
import { motion } from 'framer-motion';
import { Lock, ShieldCheck, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useCommerceEscrow } from '@/hooks/useCommerceEscrow';
import { useMerchantRegistry } from '@/hooks/useMerchantRegistry';

const VFIDE_DECIMALS = 18;
const EMPTY_METAHASH = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

export function CreateTab() {
  const { address } = useAccount();
  const { openAndFundWithIntent, escrowConfigured, isWritePending } = useCommerceEscrow();

  const [merchantOwner, setMerchantOwner] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pre-flight: check if the entered address is a registered merchant. Hook is
  // always called (rules-of-hooks); if the input isn't a valid address yet,
  // pass undefined so the hook's enabled-flag short-circuits the RPC call.
  const trimmedMerchant = merchantOwner.trim();
  const merchantValid = trimmedMerchant.length > 0 && isAddress(trimmedMerchant);
  const merchantRegistry = useMerchantRegistry({
    targetAddress: merchantValid ? (trimmedMerchant as Address) : undefined,
  });

  const canSubmit =
    !!address &&
    escrowConfigured &&
    merchantValid &&
    amount.trim().length > 0 &&
    !isWritePending;

  const handleSubmit = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!escrowConfigured) {
      setError('CommerceEscrow is not configured for this environment.');
      return;
    }
    if (!address) {
      setError('Connect your wallet to create an escrow.');
      return;
    }
    if (!merchantValid) {
      setError('Enter a valid merchant address.');
      return;
    }

    let amountWei: bigint;
    try {
      amountWei = parseUnits(amount.trim(), VFIDE_DECIMALS);
    } catch {
      setError('Invalid amount.');
      return;
    }
    if (amountWei === 0n) {
      setError('Amount must be greater than zero.');
      return;
    }

    const metaHash: `0x${string}` =
      notes.trim().length > 0 ? keccak256(stringToBytes(notes.trim())) : EMPTY_METAHASH;

    try {
      const { id } = await openAndFundWithIntent({
        merchantOwner: trimmedMerchant as Address,
        amountWei,
        metaHash,
      });
      setSuccessMessage(
        `Escrow #${id} opened and funded. Funds are held until you release them, or you dispute if there's an issue.`
      );
      // Reset the form for the next escrow
      setMerchantOwner('');
      setAmount('');
      setNotes('');
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Failed to create escrow.');
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to create an escrow.</p>
        <div className="mt-6 flex justify-center">
          <VfideConnectButton size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div className="bg-cyan-500/5 border border-accent/20 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={18} className="text-cyan-400" />
          <h3 className="text-white font-semibold">Pay with escrow protection</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Funds are held in a smart contract until you confirm fulfillment. If something&apos;s wrong, you
          can open a dispute and the DAO will arbitrate. One signature, one transaction — no separate
          approval setup needed.
        </p>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Merchant address</label>
          <input
            type="text"
            value={merchantOwner}
            onChange={(e) => setMerchantOwner(e.target.value)}
            placeholder="0x…"
            className="w-full bg-black/40 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder:text-gray-600 focus:border-accent focus:outline-none text-sm font-mono"
          />
          {merchantValid && !merchantRegistry.isLoadingInfo && merchantRegistry.isRegistered && !merchantRegistry.isSuspended && !merchantRegistry.isDelisted && (
            <p className="mt-1 text-xs text-emerald-300/80 inline-flex items-center gap-1">
              <CheckCircle2 size={10} /> Registered merchant
              {merchantRegistry.merchant?.metaHash ? '' : ''}
            </p>
          )}
          {merchantValid && !merchantRegistry.isLoadingInfo && !merchantRegistry.isRegistered && (
            <p className="mt-1 text-xs text-amber-300/80 inline-flex items-center gap-1">
              <AlertCircle size={10} /> Address isn&apos;t in the MerchantRegistry. Escrow creation will revert.
            </p>
          )}
          {merchantValid && !merchantRegistry.isLoadingInfo && merchantRegistry.isSuspended && (
            <p className="mt-1 text-xs text-red-300/80 inline-flex items-center gap-1">
              <AlertCircle size={10} /> Merchant is suspended. Escrow creation will revert.
            </p>
          )}
          {merchantValid && !merchantRegistry.isLoadingInfo && merchantRegistry.isDelisted && (
            <p className="mt-1 text-xs text-red-300/80 inline-flex items-center gap-1">
              <AlertCircle size={10} /> Merchant is delisted. Escrow creation will revert.
            </p>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Amount (VFIDE)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full bg-black/40 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder:text-gray-600 focus:border-accent focus:outline-none text-sm tabular-nums"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Order details, terms, anything that helps you remember what this escrow is for."
            rows={3}
            className="w-full bg-black/40 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder:text-gray-600 focus:border-accent focus:outline-none text-xs"
          />
          <p className="mt-1 text-xs text-gray-500 inline-flex items-start gap-1">
            <Info size={10} className="mt-0.5 shrink-0" />
            <span>
              Notes are hashed to a 32-byte fingerprint that goes on-chain. The full text stays
              local — keep your own copy if you need to refer back to it during a dispute.
            </span>
          </p>
        </div>

        {error && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {successMessage && !error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-start gap-2"
          >
            <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        <button
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
        >
          {isWritePending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Sign &amp; submit…
            </>
          ) : (
            <>
              <ShieldCheck size={14} />
              Open &amp; fund escrow
            </>
          )}
        </button>
      </div>
    </div>
  );
}
