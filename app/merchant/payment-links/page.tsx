'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import {
  ArrowLeft,
  Link2,
  Plus,
  X,
  Copy,
  Check,
  Pause,
  Play,
  Archive,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

type LinkStatus = 'active' | 'paused' | 'archived' | 'exhausted';

interface PaymentLink {
  id: number;
  link_id: string;
  title: string;
  description?: string | null;
  amount?: number | null;
  min_amount?: number | null;
  max_amount?: number | null;
  currency_display?: string | null;
  uses: number;
  max_uses?: number | null;
  single_use: boolean;
  expires_at?: string | null;
  status: LinkStatus;
  created_at: string;
}

const STATUS_BADGE: Record<LinkStatus, string> = {
  active:    'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  paused:    'bg-amber-500/10 border-amber-500/30 text-amber-300',
  archived:  'bg-zinc-800/40 border-zinc-700/40 text-zinc-500',
  exhausted: 'bg-red-500/10 border-red-500/30 text-red-300',
};

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export default function MerchantPaymentLinksPage() {
  const { address } = useAccount();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const response = await fetch('/api/merchant/payment-links');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load payment links');
      setLinks(Array.isArray(data.links) ? data.links : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payment links');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { void load(); }, [load]);

  const updateLink = useCallback(async (id: number, patch: Partial<PaymentLink>) => {
    try {
      const response = await fetch('/api/merchant/payment-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to update link');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update link');
    }
  }, [load]);

  const deleteLink = useCallback(async (id: number) => {
    setPendingDelete(id);
  }, []);

  const confirmDeleteLink = useCallback(async () => {
    const id = pendingDelete;
    if (id == null) return;
    setPendingDelete(null);
    try {
      const response = await fetch(`/api/merchant/payment-links?id=${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to delete link');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete link');
    }
  }, [pendingDelete, load]);

  const copyLink = useCallback(async (link: PaymentLink) => {
    const url = `${window.location.origin}/pay/link/${link.link_id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.link_id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore — most browsers without clipboard API are uncommon
    }
  }, []);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
        <section className="py-12">
          <div className="container mx-auto max-w-6xl px-4">
            <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
              <ArrowLeft size={16} /> Back to Merchant Hub
            </Link>

            <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="badge-live mb-3">
                  <Link2 size={14} /> Payment Links
                </div>
                <h1 className="text-4xl font-black tracking-tight">Shareable checkout links</h1>
                <p className="mt-3 max-w-3xl text-gray-400">
                  Generate a URL for a specific product, service, or open amount. Share by text, email, DM, or paste into a bio.
                </p>
              </div>
              <button onClick={() => setShowCreate(true)} disabled={!address} className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90">
                <Plus size={18} /> New link
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
            )}

            {!address ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
                Connect the merchant wallet to manage payment links.
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center text-zinc-400">Loading…</div>
                ) : links.length === 0 ? (
                  <div className="p-12 text-center text-zinc-400">No payment links yet. Click New link to create one.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {links.map((l) => (
                      <PaymentLinkRow
                        key={l.id}
                        link={l}
                        copied={copiedId === l.link_id}
                        onCopy={() => copyLink(l)}
                        onPause={() => updateLink(l.id, { status: 'paused' })}
                        onResume={() => updateLink(l.id, { status: 'active' })}
                        onArchive={() => updateLink(l.id, { status: 'archived' })}
                        onDelete={() => deleteLink(l.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {showCreate && address && (
        <CreateLinkModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
          onError={setError}
        />
      )}

      <ConfirmModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDeleteLink}
        title="Delete payment link?"
        message="Existing customers who have this link saved will get an error. This cannot be undone."
        confirmText="Delete"
        cancelText="Keep"
        variant="danger"
      />

      <Footer />
    </>
  );
}

function PaymentLinkRow({ link, copied, onCopy, onPause, onResume, onArchive, onDelete }: {
  link: PaymentLink;
  copied: boolean;
  onCopy: () => void;
  onPause: () => void;
  onResume: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}/pay/link/${link.link_id}` : `/pay/link/${link.link_id}`;
  return (
    <div className="p-4 hover:bg-white/5 transition-colors flex items-start gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium">{link.title}</span>
          <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded border ${STATUS_BADGE[link.status]}`}>{link.status}</span>
          {link.single_use && <span className="inline-flex items-center px-2 py-0.5 text-xs rounded border border-purple-500/30 bg-purple-500/10 text-purple-300">single-use</span>}
        </div>
        {link.description && <div className="text-xs text-zinc-500 mb-1 line-clamp-1">{link.description}</div>}
        <div className="text-sm text-zinc-300">
          {link.amount
            ? <>{Number(link.amount).toFixed(2)} VFIDE</>
            : link.min_amount || link.max_amount
            ? <>Open: {link.min_amount ? `${Number(link.min_amount).toFixed(2)}–` : ''}{link.max_amount ? `${Number(link.max_amount).toFixed(2)}` : '∞'} VFIDE</>
            : <>Customer enters amount</>}
        </div>
        <div className="text-xs text-zinc-500 mt-1 space-x-3">
          <span>{link.uses} use{link.uses === 1 ? '' : 's'}{link.max_uses ? ` / ${link.max_uses}` : ''}</span>
          {link.expires_at && <span>· expires {new Date(link.expires_at).toLocaleDateString()}</span>}
        </div>
        <div className="mt-2 font-mono text-xs text-zinc-500 break-all">{fullUrl}</div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={onCopy} className="text-xs px-3 py-1.5 border border-accent/30 bg-accent/10 text-accent rounded hover:bg-cyan-500/20 inline-flex items-center gap-1">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a
          href={`/pay/link/${link.link_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 border border-white/10 rounded hover:bg-white/5 inline-flex items-center gap-1"
        >
          <ExternalLink size={12} /> Open
        </a>
        {link.status === 'active' && (
          <button onClick={onPause} className="text-xs px-3 py-1.5 border border-amber-500/30 bg-amber-500/10 text-amber-300 rounded hover:bg-amber-500/20 inline-flex items-center gap-1">
            <Pause size={12} /> Pause
          </button>
        )}
        {link.status === 'paused' && (
          <button onClick={onResume} className="text-xs px-3 py-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 rounded hover:bg-emerald-500/20 inline-flex items-center gap-1">
            <Play size={12} /> Resume
          </button>
        )}
        {link.status !== 'archived' && (
          <button onClick={onArchive} className="text-xs px-3 py-1.5 border border-white/10 text-zinc-300 rounded hover:bg-white/5 inline-flex items-center gap-1">
            <Archive size={12} /> Archive
          </button>
        )}
        {link.status === 'archived' && (
          <button onClick={onDelete} className="text-xs px-3 py-1.5 border border-red-500/30 bg-red-500/10 text-red-300 rounded hover:bg-red-500/20 inline-flex items-center gap-1">
            <Trash2 size={12} /> Delete
          </button>
        )}
      </div>
    </div>
  );
}

function CreateLinkModal({ onClose, onCreated, onError }: { onClose: () => void; onCreated: () => Promise<void>; onError: (m: string) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amountMode, setAmountMode] = useState<'fixed' | 'open'>('fixed');
  const [amount, setAmount] = useState(0);
  const [minAmount, setMinAmount] = useState(0);
  const [maxAmount, setMaxAmount] = useState(0);
  const [singleUse, setSingleUse] = useState(false);
  const [maxUses, setMaxUses] = useState<number | ''>('');
  const [expiresDate, setExpiresDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [token] = useState(process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS ?? '0x0000000000000000000000000000000000000000');

  const canSubmit =
    title.trim().length > 0 &&
    ADDRESS_REGEX.test(token) &&
    (amountMode === 'fixed' ? amount > 0 : true) &&
    !submitting;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/merchant/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          token: token.toLowerCase(),
          amount: amountMode === 'fixed' ? amount : undefined,
          min_amount: amountMode === 'open' && minAmount > 0 ? minAmount : undefined,
          max_amount: amountMode === 'open' && maxAmount > 0 ? maxAmount : undefined,
          single_use: singleUse,
          max_uses: !singleUse && maxUses !== '' ? Number(maxUses) : undefined,
          expires_at: expiresDate ? new Date(expiresDate).toISOString() : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to create link');
      await onCreated();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to create link');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, title, description, amountMode, amount, minAmount, maxAmount, singleUse, maxUses, expiresDate, token, onCreated, onError]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      tabIndex={-1}
    >
      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 max-w-md w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">New payment link</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white" aria-label="Close"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Title *</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Saturday haircut deposit" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Description (optional)</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none resize-none" />
          </label>

          <div>
            <span className="text-xs text-zinc-400 mb-2 block">Amount</span>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setAmountMode('fixed')} className={`flex-1 px-3 py-2 text-sm rounded-lg border ${amountMode === 'fixed' ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 bg-zinc-900'}`}>
                Fixed
              </button>
              <button onClick={() => setAmountMode('open')} className={`flex-1 px-3 py-2 text-sm rounded-lg border ${amountMode === 'open' ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 bg-zinc-900'}`}>
                Customer enters
              </button>
            </div>
            {amountMode === 'fixed' ? (
              <input type="number" min={0.01} step={0.01} value={amount} onChange={(e) => setAmount(Number(e.target.value))} placeholder="25.00 VFIDE" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min={0} step={0.01} value={minAmount} onChange={(e) => setMinAmount(Number(e.target.value))} placeholder="Min (optional)" className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                <input type="number" min={0} step={0.01} value={maxAmount} onChange={(e) => setMaxAmount(Number(e.target.value))} placeholder="Max (optional)" className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm" />
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={singleUse} onChange={(e) => setSingleUse(e.target.checked)} className="accent-cyan-500" />
            <span>Single-use (link expires after first successful payment)</span>
          </label>

          {!singleUse && (
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">Max total uses (optional)</span>
              <input type="number" min={1} step={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Unlimited" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            </label>
          )}

          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Expires (optional)</span>
            <input type="date" value={expiresDate} onChange={(e) => setExpiresDate(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm" />
          </label>

          <button onClick={submit} disabled={!canSubmit} className="w-full px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Creating…' : 'Create link'}
          </button>
        </div>
      </div>
    </div>
  );
}
