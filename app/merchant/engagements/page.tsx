'use client';

/**
 * Professional Services — Engagements page (Phase 2 authoring/lifecycle UI)
 *
 * Role-aware: a provider creates an engagement, defines milestones, proposes it; the client accepts, funds
 * milestones, and accepts/rejects deliverables; the provider submits deliverables. Each milestone maps to one
 * CommerceEscrow. This screen drives /api/merchant/engagements + /api/merchant/milestones.
 *
 * Note shown to the user: funding/release/dispute are on-chain wallet actions on CommerceEscrow; this screen
 * records the engagement lifecycle and tells the wallet which escrow call to make.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ArrowLeft, Plus, Loader2, Briefcase, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

interface Engagement {
  id: string; provider_address: string; client_address: string; title: string; scope: string;
  status: string; engagement_type: string; total_amount: number | string; role: 'provider' | 'client';
  milestone_count?: number;
}
interface Milestone {
  id: string; seq: number; title: string; description: string; amount: number | string;
  escrow_id: number | null; status: string; acceptance_deadline: string | null; reject_reason: string | null;
}

export default function EngagementsPage() {
  const { isConnected } = useAccount();
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [selected, setSelected] = useState<Engagement | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // create form (provider)
  const [showCreate, setShowCreate] = useState(false);
  const [clientAddr, setClientAddr] = useState('');
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');

  const loadList = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/merchant/engagements');
      if (!res.ok) throw new Error('Failed to load engagements');
      const d = await res.json();
      setEngagements(Array.isArray(d.engagements) ? d.engagements : []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/merchant/engagements?engagement_id=${id}`);
      if (!res.ok) throw new Error('Failed to load engagement');
      const d = await res.json();
      setSelected(d.engagement);
      setMilestones(Array.isArray(d.milestones) ? d.milestones : []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);

  const engAction = async (body: Record<string, unknown>) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/merchant/engagements', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Action failed');
      await loadList();
      if (selected) await loadDetail(selected.id);
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); return false; }
    finally { setBusy(false); }
  };

  const mAction = async (body: Record<string, unknown>) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/merchant/milestones', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Action failed');
      if (d.escrow_action) {
        setError(null);
        // surface the required wallet action to the user
        window.alert(`Recorded. Next: your wallet must call CommerceEscrow.${d.escrow_action}(${d.escrow_id ?? ''}).`);
      }
      if (selected) await loadDetail(selected.id);
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); return false; }
    finally { setBusy(false); }
  };

  const create = async () => {
    if (!clientAddr.trim() || !title.trim()) { setError('Client address and title required'); return; }
    const ok = await engAction({ action: 'create', client_address: clientAddr.trim().toLowerCase(), title: title.trim(), scope: scope.trim() });
    if (ok) { setShowCreate(false); setClientAddr(''); setTitle(''); setScope(''); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      released: 'text-emerald-400', accepted: 'text-emerald-400', completed: 'text-emerald-400',
      in_dispute: 'text-red-400', disputed: 'text-red-400', rejected: 'text-red-400',
      submitted: 'text-amber-400', funded: 'text-cyan-400', proposed: 'text-cyan-400', active: 'text-cyan-400',
    };
    return <span className={`text-xs font-semibold capitalize ${map[s] ?? 'text-zinc-400'}`}>{s.replace('_', ' ')}</span>;
  };

  const input = 'w-full bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm';

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/merchant" className="text-sm text-zinc-400 hover:text-white inline-flex items-center gap-1 mb-4"><ArrowLeft size={14} /> Back</Link>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2"><Briefcase size={22} className="text-accent" /><h1 className="text-2xl font-bold">Engagements</h1></div>
          {!selected && <button onClick={() => setShowCreate(!showCreate)} className="text-sm px-3 py-1.5 bg-gradient-to-r from-accent to-blue-500 rounded-lg font-semibold inline-flex items-center gap-1"><Plus size={14} /> New</button>}
        </div>
        <p className="text-sm text-zinc-500 mb-6">Staged service work with per-milestone escrow. Each milestone is funded, delivered, and accepted independently; silence past the review window auto-accepts. Funding and release are on-chain wallet actions.</p>

        {!isConnected && <div className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">Connect your wallet to manage engagements.</div>}
        {error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">{error}</div>}

        {showCreate && !selected && (
          <div className="border border-white/10 rounded-xl p-4 mb-6 space-y-3">
            <h2 className="font-semibold text-sm">New engagement (you are the provider)</h2>
            <input value={clientAddr} onChange={(e) => setClientAddr(e.target.value)} className={input} placeholder="Client wallet address (0x…)" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="Title (e.g. Brand redesign)" />
            <textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={3} className={input} placeholder="Scope of work" />
            <button disabled={busy} onClick={create} className="px-4 py-2 bg-gradient-to-r from-accent to-blue-500 rounded-lg text-sm font-semibold disabled:opacity-50">Create draft</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : selected ? (
          <div className="space-y-4">
            <button onClick={() => { setSelected(null); setMilestones([]); }} className="text-xs text-zinc-400 hover:text-white">← All engagements</button>
            <div className="border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{selected.title}</h2>
                {statusBadge(selected.status)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">{selected.role === 'provider' ? 'You are the provider' : 'You are the client'} · {selected.engagement_type.replace('_', ' ')} · total {String(selected.total_amount)}</p>
              {selected.scope && <p className="text-sm text-zinc-400 mt-2 whitespace-pre-wrap">{selected.scope}</p>}

              {/* engagement-level actions */}
              <div className="flex gap-2 mt-3">
                {selected.role === 'provider' && selected.status === 'draft' && (
                  <button disabled={busy} onClick={() => engAction({ action: 'propose', id: selected.id })} className="text-xs px-3 py-1.5 bg-accent/15 text-accent border border-accent/30 rounded">Propose to client</button>
                )}
                {selected.role === 'client' && selected.status === 'proposed' && (
                  <button disabled={busy} onClick={() => engAction({ action: 'accept', id: selected.id })} className="text-xs px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded">Accept engagement</button>
                )}
              </div>
            </div>

            {/* milestones */}
            <div className="space-y-2">
              {milestones.map((m) => (
                <div key={m.id} className="border border-white/5 bg-white/3 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{m.seq}. {m.title}</span>
                    <div className="flex items-center gap-2">{statusBadge(m.status)}<span className="text-xs text-zinc-500">{String(m.amount)}</span></div>
                  </div>
                  {m.description && <p className="text-xs text-zinc-500 mt-1">{m.description}</p>}
                  {m.acceptance_deadline && m.status === 'submitted' && (
                    <p className="text-xs text-amber-400/80 mt-1 inline-flex items-center gap-1"><Clock size={11} /> review by {new Date(m.acceptance_deadline).toLocaleDateString()} (else auto-accepts)</p>
                  )}
                  {m.reject_reason && <p className="text-xs text-red-400/80 mt-1">Rejected: {m.reject_reason}</p>}
                  <div className="flex gap-2 mt-2">
                    {selected.role === 'client' && m.status === 'defined' && (
                      <button disabled={busy} onClick={() => { const id = window.prompt('Enter the on-chain escrow id you funded for this milestone:'); if (id) mAction({ action: 'link_escrow', milestone_id: m.id, escrow_id: Number(id) }); }} className="text-xs px-2.5 py-1 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded">Link funded escrow</button>
                    )}
                    {selected.role === 'provider' && (m.status === 'funded' || m.status === 'submitted') && (
                      <button disabled={busy} onClick={() => { const uri = window.prompt('Deliverable link / note:') ?? ''; mAction({ action: 'deliver', milestone_id: m.id, uri }); }} className="text-xs px-2.5 py-1 bg-accent/15 text-accent border border-accent/30 rounded inline-flex items-center gap-1"><Plus size={11} /> Submit deliverable</button>
                    )}
                    {selected.role === 'client' && m.status === 'submitted' && (
                      <>
                        <button disabled={busy} onClick={() => mAction({ action: 'accept', milestone_id: m.id })} className="text-xs px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded inline-flex items-center gap-1"><CheckCircle2 size={11} /> Accept</button>
                        <button disabled={busy} onClick={() => { const reason = window.prompt('Reason for rejection:'); if (reason) mAction({ action: 'reject', milestone_id: m.id, reason }); }} className="text-xs px-2.5 py-1 bg-red-500/15 text-red-400 border border-red-500/30 rounded inline-flex items-center gap-1"><XCircle size={11} /> Reject</button>
                      </>
                    )}
                    {m.status === 'accepted' && (
                      <button disabled={busy} onClick={() => mAction({ action: 'confirm_release', milestone_id: m.id })} className="text-xs px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded">Confirm on-chain release</button>
                    )}
                  </div>
                </div>
              ))}
              {selected.role === 'provider' && ['draft', 'proposed'].includes(selected.status) && (
                <button disabled={busy} onClick={() => { const t = window.prompt('Milestone title:'); const a = window.prompt('Milestone amount:'); if (t && a) engAction({ action: 'add_milestone', id: selected.id, seq: milestones.length + 1, title: t, amount: Number(a) }); }} className="text-xs px-3 py-1.5 border border-white/10 rounded inline-flex items-center gap-1 text-zinc-300"><Plus size={12} /> Add milestone</button>
              )}
            </div>
          </div>
        ) : engagements.length === 0 ? (
          <div className="text-sm text-zinc-500">No engagements yet.</div>
        ) : (
          <div className="space-y-2">
            {engagements.map((e) => (
              <button key={e.id} onClick={() => loadDetail(e.id)} className="w-full text-left border border-white/5 bg-white/3 rounded-lg p-3 hover:bg-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{e.title}</span>
                  {statusBadge(e.status)}
                </div>
                <p className="text-xs text-zinc-500 mt-1">{e.role} · {e.milestone_count ?? 0} milestone(s) · total {String(e.total_amount)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
