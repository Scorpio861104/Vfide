'use client';

/**
 * EscrowDetailContent — rich state-aware view for a single CommerceEscrow.
 *
 * Loads the escrow by id, identifies the viewer's relationship to it
 * (buyer / merchant / observer / unrelated), and exposes all 7 user-facing
 * lifecycle actions including the edge-case ones that don't fit on cards:
 *
 *   cancelStaleOpen        — permissionless, available 7 days after OPEN if
 *                            the escrow was never funded. Cleans up storage.
 *   settleByInheritance    — permissionless, available when either party's
 *                            vault has entered MEMORIAL state. Refunds buyer.
 *
 * Reads VaultHub.isInMemorialState for both buyer and merchant vaults at
 * load time so the inheritance-settle action surfaces automatically when
 * applicable — the viewer doesn't have to know to look for it.
 *
 * Empty / invalid escrow ids render a useful 404-equivalent rather than
 * blank state.
 */

import { useState, useMemo, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { formatUnits, type Address } from 'viem';
import {
  ArrowLeft,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  Scale,
  Copy,
  CheckCheck,
  AlertCircle,
  ShoppingBag,
  Store,
  Eye,
  ArrowRight,
} from 'lucide-react';
import {
  useCommerceEscrow,
  useEscrowById,
  EscrowState,
  escrowStateLabel,
} from '@/hooks/useCommerceEscrow';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
import { VaultHubABI } from '@/lib/abis';
import { PromptModal } from '@/components/ui/PromptModal';

const VFIDE_DECIMALS = 18;
const OPEN_ESCROW_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

type ViewerRole = 'buyer' | 'merchant' | 'observer';

function shortAddress(a: Address): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function stateStyle(state: EscrowState) {
  switch (state) {
    case EscrowState.Open:
      return { ring: 'ring-amber-500/30', text: 'text-amber-300', icon: Clock };
    case EscrowState.Funded:
      return { ring: 'ring-cyan-500/30', text: 'text-accent', icon: Lock };
    case EscrowState.Released:
      return { ring: 'ring-emerald-500/30', text: 'text-emerald-300', icon: CheckCircle2 };
    case EscrowState.Refunded:
      return { ring: 'ring-blue-500/30', text: 'text-blue-300', icon: ArrowRight };
    case EscrowState.Disputed:
      return { ring: 'ring-red-500/30', text: 'text-red-300', icon: AlertTriangle };
    case EscrowState.Resolved:
      return { ring: 'ring-purple-500/30', text: 'text-purple-300', icon: Scale };
    default:
      return { ring: 'ring-gray-500/30', text: 'text-gray-300', icon: XCircle };
  }
}

interface Props {
  id: string;
}

export function EscrowDetailContent({ id }: Props) {
  const router = useRouter();
  const { address: connectedAddress } = useAccount();
  const vaultHubAddress = CONTRACT_ADDRESSES.VaultHub;
  const vaultHubConfigured = isConfiguredContractAddress(vaultHubAddress);

  // Parse the id from the URL. Reject non-numeric strings cleanly.
  const parsedId = useMemo(() => {
    try {
      const n = BigInt(id);
      return n >= 0n ? n : null;
    } catch {
      return null;
    }
  }, [id]);

  const { escrow, deposited, isLoading, refetch } = useEscrowById(parsedId ?? undefined);
  const {
    release,
    refund,
    dispute,
    cancelStaleOpen,
    settleByInheritance,
    isWritePending,
  } = useCommerceEscrow();

  // Memorial-state reads for both parties — drives the settleByInheritance UX.
  // Disabled until we know the escrow's buyerVault/sellerVault addresses.
  const { data: buyerMemorial } = useReadContract({
    address: vaultHubAddress,
    abi: VaultHubABI,
    functionName: 'isInMemorialState',
    args: escrow ? [escrow.buyerVault] : undefined,
    query: { enabled: vaultHubConfigured && !!escrow && (escrow.state === EscrowState.Funded || escrow.state === EscrowState.Disputed) },
  });
  const { data: merchantMemorial } = useReadContract({
    address: vaultHubAddress,
    abi: VaultHubABI,
    functionName: 'isInMemorialState',
    args: escrow ? [escrow.sellerVault] : undefined,
    query: { enabled: vaultHubConfigured && !!escrow && (escrow.state === EscrowState.Funded || escrow.state === EscrowState.Disputed) },
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [hashCopied, setHashCopied] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // Resolve viewer role. If the wallet matches neither buyer nor merchant, they're an observer
  // (can still see most things; only state-independent actions like cancelStaleOpen and
  // settleByInheritance are available, since those are permissionless).
  const viewerRole: ViewerRole | null = useMemo(() => {
    if (!escrow || !connectedAddress) return null;
    if (escrow.buyerOwner.toLowerCase() === connectedAddress.toLowerCase()) return 'buyer';
    if (escrow.merchantOwner.toLowerCase() === connectedAddress.toLowerCase()) return 'merchant';
    return 'observer';
  }, [escrow, connectedAddress]);

  // OPEN-expiry timing for cancelStaleOpen availability
  const openExpiryReady = useMemo(() => {
    if (!escrow || escrow.state !== EscrowState.Open || escrow.openedAt === 0) return false;
    const now = Math.floor(Date.now() / 1000);
    return now >= escrow.openedAt + OPEN_ESCROW_EXPIRY_SECONDS;
  }, [escrow]);

  const openExpiryAt = useMemo(() => {
    if (!escrow || escrow.openedAt === 0) return null;
    return new Date((escrow.openedAt + OPEN_ESCROW_EXPIRY_SECONDS) * 1000);
  }, [escrow]);

  const inheritanceAvailable =
    !!escrow &&
    (escrow.state === EscrowState.Funded || escrow.state === EscrowState.Disputed) &&
    (buyerMemorial === true || merchantMemorial === true);

  // ── Action handlers ─────────────────────────────────────────────────────

  const runAction = useCallback(
    async (fn: () => Promise<unknown>, successMsg: string) => {
      setActionError(null);
      setActionMessage(null);
      try {
        await fn();
        setActionMessage(successMsg);
        await refetch();
      } catch (e: any) {
        setActionError(e?.shortMessage || e?.message || 'Action failed.');
      }
    },
    [refetch]
  );

  const handleRelease = () => escrow && runAction(() => release(escrow.id), `Escrow #${escrow.id} released to merchant.`);
  const handleRefund = () => escrow && runAction(() => refund(escrow.id), `Escrow #${escrow.id} refunded to buyer.`);
  const handleDispute = () => {
    if (!escrow) return;
    setDisputeModalOpen(true);
  };

  const submitDispute = async (reason: string) => {
    if (!escrow) return;
    setDisputeSubmitting(true);
    try {
      await runAction(() => dispute({ escrowId: escrow.id, reason }), `Dispute opened on escrow #${escrow.id}. DAO will review.`);
      setDisputeModalOpen(false);
    } finally {
      setDisputeSubmitting(false);
    }
  };
  const handleCancelStale = () =>
    escrow && runAction(() => cancelStaleOpen(escrow.id), `Stale escrow #${escrow.id} cancelled.`);
  const handleSettleByInheritance = () =>
    escrow &&
    runAction(
      () => settleByInheritance(escrow.id),
      `Escrow #${escrow.id} settled by inheritance — funds returned to the buyer's current vault.`
    );

  const copyMetaHash = () => {
    if (!escrow) return;
    navigator.clipboard.writeText(escrow.metaHash).catch(() => {});
    setHashCopied(true);
    setTimeout(() => setHashCopied(false), 1500);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  // Invalid id
  if (parsedId === null) {
    return (
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem]">
        <div className="container mx-auto px-4 max-w-3xl py-8">
          <button
            onClick={() => router.push('/escrow')}
            className="text-accent hover:text-accent text-sm inline-flex items-center gap-1 mb-6"
          >
            <ArrowLeft size={14} /> Back to escrows
          </button>
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 text-center">
            <XCircle className="mx-auto text-red-400 mb-3" size={32} />
            <p className="text-white font-semibold mb-1">Invalid escrow id</p>
            <p className="text-gray-400 text-sm">
              <code className="font-mono">{id}</code> is not a valid escrow identifier.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading || !escrow) {
    return (
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem]">
        <div className="container mx-auto px-4 max-w-3xl py-8">
          <button
            onClick={() => router.push('/escrow')}
            className="text-accent hover:text-accent text-sm inline-flex items-center gap-1 mb-6"
          >
            <ArrowLeft size={14} /> Back to escrows
          </button>
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="text-accent animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // Escrow id doesn't exist (state is NONE)
  if (escrow.state === EscrowState.None) {
    return (
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem]">
        <div className="container mx-auto px-4 max-w-3xl py-8">
          <button
            onClick={() => router.push('/escrow')}
            className="text-accent hover:text-accent text-sm inline-flex items-center gap-1 mb-6"
          >
            <ArrowLeft size={14} /> Back to escrows
          </button>
          <div className="bg-gray-500/5 border border-gray-500/20 rounded-2xl p-8 text-center">
            <XCircle className="mx-auto text-gray-400 mb-3" size={32} />
            <p className="text-white font-semibold mb-1">Escrow #{parsedId.toString()} not found</p>
            <p className="text-gray-400 text-sm">No escrow exists with this id.</p>
          </div>
        </div>
      </div>
    );
  }

  const style = stateStyle(escrow.state);
  const StateIcon = style.icon;
  const amountFormatted = formatUnits(escrow.amount, VFIDE_DECIMALS);
  const openedDate = escrow.openedAt > 0 ? new Date(escrow.openedAt * 1000) : null;
  const isTerminal = [EscrowState.Released, EscrowState.Refunded, EscrowState.Resolved].includes(escrow.state);

  // Action availability matrix (mirrors contract access control)
  const canBuyerRelease = viewerRole === 'buyer' && escrow.state === EscrowState.Funded;
  const canBuyerDispute = viewerRole === 'buyer' && escrow.state === EscrowState.Funded;
  const canMerchantRefund =
    viewerRole === 'merchant' &&
    (escrow.state === EscrowState.Funded || escrow.state === EscrowState.Disputed);
  const canMerchantDispute = viewerRole === 'merchant' && escrow.state === EscrowState.Funded;

  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-12">
      <div className="container mx-auto px-4 max-w-3xl py-8">
        <button
          onClick={() => router.push('/escrow')}
          className="text-accent hover:text-accent text-sm inline-flex items-center gap-1 mb-6"
        >
          <ArrowLeft size={14} /> Back to escrows
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-white/3 border border-white/10 rounded-2xl p-6 ring-1 ${style.ring}`}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Escrow #{escrow.id.toString()}</p>
              <p className="text-3xl font-bold text-white tabular-nums">
                {amountFormatted} <span className="text-gray-400 text-xl font-normal">VFIDE</span>
              </p>
            </div>
            <div className={`flex items-center gap-2 text-sm font-semibold ${style.text}`}>
              <StateIcon size={18} />
              {escrowStateLabel(escrow.state)}
            </div>
          </div>

          {viewerRole && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400">
              {viewerRole === 'buyer' && (
                <>
                  <ShoppingBag size={12} className="text-accent" /> You are the buyer
                </>
              )}
              {viewerRole === 'merchant' && (
                <>
                  <Store size={12} className="text-purple-400" /> You are the merchant
                </>
              )}
              {viewerRole === 'observer' && (
                <>
                  <Eye size={12} className="text-gray-400" /> Viewing as a third party
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* Parties */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white/3 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Buyer</p>
            <p className="text-sm font-mono text-white break-all">{shortAddress(escrow.buyerOwner)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Vault <span className="font-mono">{shortAddress(escrow.buyerVault)}</span>
            </p>
          </div>
          <div className="bg-white/3 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Merchant</p>
            <p className="text-sm font-mono text-white break-all">{shortAddress(escrow.merchantOwner)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Vault <span className="font-mono">{shortAddress(escrow.sellerVault)}</span>
            </p>
          </div>
        </div>

        {/* Timing + metadata */}
        <div className="mt-4 bg-white/3 border border-white/10 rounded-xl p-4 space-y-3">
          {openedDate && (
            <div className="flex items-start justify-between gap-3 flex-wrap text-sm">
              <span className="text-gray-500">Opened</span>
              <span className="text-white">{openedDate.toLocaleString()}</span>
            </div>
          )}
          {deposited !== undefined && deposited > 0n && (
            <div className="flex items-start justify-between gap-3 flex-wrap text-sm">
              <span className="text-gray-500">Currently in escrow</span>
              <span className="text-white tabular-nums">{formatUnits(deposited, VFIDE_DECIMALS)} VFIDE</span>
            </div>
          )}
          <div className="flex items-start justify-between gap-3 flex-wrap text-sm">
            <span className="text-gray-500">Order hash</span>
            <button
              onClick={copyMetaHash}
              className="font-mono text-xs text-white/80 hover:text-white inline-flex items-center gap-1.5 break-all"
              title="Copy full hash"
            >
              {escrow.metaHash.slice(0, 10)}…{escrow.metaHash.slice(-8)}
              {hashCopied ? (
                <CheckCheck size={12} className="text-emerald-400 shrink-0" />
              ) : (
                <Copy size={12} className="text-gray-500 shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Action messages */}
        {actionError && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}
        {actionMessage && !actionError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-start gap-2"
          >
            <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
            <span>{actionMessage}</span>
          </motion.div>
        )}

        {/* Primary actions (role-dependent) */}
        {(canBuyerRelease || canBuyerDispute || canMerchantRefund || canMerchantDispute) && (
          <div className="mt-6 bg-white/3 border border-white/10 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">Actions</p>
            <div className="flex flex-wrap gap-2">
              {canBuyerRelease && (
                <button
                  onClick={handleRelease}
                  disabled={isWritePending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  {isWritePending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Release to merchant
                </button>
              )}
              {canMerchantRefund && (
                <button
                  onClick={handleRefund}
                  disabled={isWritePending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  {isWritePending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  Refund to buyer
                </button>
              )}
              {(canBuyerDispute || canMerchantDispute) && (
                <button
                  onClick={handleDispute}
                  disabled={isWritePending}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  {isWritePending ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                  Open dispute
                </button>
              )}
            </div>
          </div>
        )}

        {/* DISPUTED awaiting-DAO notice */}
        {escrow.state === EscrowState.Disputed && !canMerchantRefund && (
          <div className="mt-6 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-200 flex items-start gap-2">
            <Scale size={14} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Awaiting DAO resolution</p>
              <p className="text-amber-200/80">
                Funds remain held in escrow until the DAO arbitrates the dispute. The merchant can also
                still refund directly at any time.
              </p>
            </div>
          </div>
        )}

        {/* Edge case 1: cancelStaleOpen — permissionless, any viewer, OPEN-only after expiry */}
        {escrow.state === EscrowState.Open && (
          <div className="mt-6 bg-white/3 border border-white/10 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Open escrow status</p>
            {openExpiryReady ? (
              <>
                <p className="text-sm text-gray-300 mb-3">
                  This escrow has been unfunded for over 7 days. It can now be cancelled by anyone to free
                  up storage.
                </p>
                <button
                  onClick={handleCancelStale}
                  disabled={isWritePending}
                  className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  {isWritePending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Cancel stale escrow
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-400">
                Unfunded. Can be cancelled by anyone after{' '}
                <span className="text-gray-300">{openExpiryAt?.toLocaleString() ?? 'expiry'}</span>.
              </p>
            )}
          </div>
        )}

        {/* Edge case 2: settleByInheritance — permissionless, when a party's vault is MEMORIAL */}
        {inheritanceAvailable && (
          <div className="mt-6 bg-purple-500/5 border border-purple-500/20 rounded-xl p-5">
            <div className="flex items-start gap-2 mb-3">
              <Scale className="text-purple-400 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-semibold text-white mb-1">Inheritance settlement available</p>
                <p className="text-xs text-purple-200/80">
                  {buyerMemorial && merchantMemorial
                    ? "Both parties' vaults are in memorial state."
                    : buyerMemorial
                      ? "The buyer's vault has entered memorial state."
                      : "The merchant's vault has entered memorial state."}{' '}
                  Anyone can settle this escrow now — funds return to the buyer&apos;s current vault for
                  inheritance distribution.
                </p>
              </div>
            </div>
            <button
              onClick={handleSettleByInheritance}
              disabled={isWritePending}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-1.5"
            >
              {isWritePending ? <Loader2 size={14} className="animate-spin" /> : <Scale size={14} />}
              Settle by inheritance
            </button>
          </div>
        )}

        {/* Terminal-state notice — closure context */}
        {isTerminal && (
          <div className="mt-6 bg-gray-500/5 border border-gray-500/20 rounded-xl p-4 text-xs text-gray-400">
            This escrow is closed. No further actions possible.
          </div>
        )}
      </div>

      <PromptModal
        isOpen={disputeModalOpen}
        onClose={() => !disputeSubmitting && setDisputeModalOpen(false)}
        onSubmit={submitDispute}
        title="Open a dispute"
        description={
          <span>
            Briefly describe the issue with this escrow. <strong className="text-amber-300">This text is recorded
            on-chain</strong> and will be visible to the DAO during review.
          </span>
        }
        placeholder="What's wrong with this transaction?"
        submitText={disputeSubmitting ? 'Submitting…' : 'Open dispute'}
        cancelText="Cancel"
        multiline
        minLength={5}
        maxLength={500}
        isLoading={disputeSubmitting}
      />
    </div>
  );
}
